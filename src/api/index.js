import { supabase } from './supabaseClient';
import { URL as MAIN_URL } from '../assets/variables';

// GAS fetch — kept only for features that need Google services (doc gen).
async function gasFetch(type, data, url = MAIN_URL) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ type, data }),
  });
  return response.json();
}

// ───────────────────────── helpers ──────────────────────────────────────────

const toNum = (v) =>
  v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
const toDate = (v) =>
  v === '' || v === null || v === undefined ? null : String(v).slice(0, 10);

function sanitize(obj, { cols, nums = [], dates = [] }) {
  const row = {};
  for (const c of cols) {
    if (!(c in obj)) continue;
    let v = obj[c];
    if (nums.includes(c)) v = toNum(v);
    else if (dates.includes(c)) v = toDate(v);
    else if (!Array.isArray(v) && v === '') v = null;
    row[c] = v;
  }
  return row;
}

const CASE_CFG = {
  cols: ['id', 'email', 'rank', 'status', 'source', 'sap', 'store', 'summarize', 'pic',
    'support', 'hod', 'startDate', 'endDate', 'group', 'lossValue', 'returnValue',
    'conclusion', 'note', 'type'],
  nums: ['rank', 'lossValue', 'returnValue'],
  dates: ['startDate', 'endDate'],
};

const INSPECTION_CFG = {
  cols: ['id', 'user', 'kstt', 'sap', 'store', 'qlkv', 'gdv', 'chain', 'ngayKiemTra', 'batCapVH', 'trang_thai'],
  dates: ['ngayKiemTra'],
};

const VIOLATION_ITEM_CFG = {
  cols: ['id', 'inspection_id', 'nhom', 'hanh_vi', 'mo_ta', 'nguyen_nhan',
    'trang_thai', 'gia_tri', 'ma_nv', 'ten_nv', 'xlvp',
    'ket_luan', 'nd_ket_luan', 'nd_vi_pham', 'nhom_loi', 'loi_chi_tiet', 'chuc_danh'],
  nums: ['gia_tri'],
};

const VISITPLAN_CFG = {
  cols: ['id', 'date', 'site', 'path', 'status', 'user'],
  dates: ['date'],
};

// Monthly store-visit plan (kế hoạch đi kiểm tra CH theo tháng) — separate
// from VISITPLAN_CFG above, which is an unrelated "data dump registration" feature.
const MONTHLY_VISIT_PLAN_CFG = {
  cols: ['month', 'sap', 'pic', 'user'],
  dates: ['month'],
};

const CALENDAR_CFG = {
  cols: ['date', 'user', 'name', 'work', 'storeNumber', 'martNumber'],
  nums: ['storeNumber', 'martNumber'],
  dates: ['date'],
};

const bangkokToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
};

const PAGE_SIZE = 1000;
async function fetchAllRows(makeQuery) {
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function fetchColumn(table, col) {
  return fetchAllRows(() => supabase.from(table).select(col));
}

async function nextCaseId() {
  const rows = await fetchColumn('case', 'id');
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(String(r.id).replace(/^I/i, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'I' + (max + 1);
}

async function nextInspectionId() {
  const rows = await fetchColumn('inspections', 'id');
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(String(r.id).replace(/^SV/i, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'SV' + String(max + 1).padStart(5, '0');
}

async function nextVisitPlanId() {
  const rows = await fetchColumn('visit_plan', 'id');
  let max = 0;
  rows.forEach((r) => {
    const n = Number(r.id);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

// ───────────────────────── bulk load (login / refresh) ───────────────────────

async function getData(u) {
  const user = { id: u.user, name: u.name, role: u.role, hod: u.hod, director: u.director, isAdmin: u.is_admin || false, leadXlvp: u.lead_xlvp || false, leadGhiNhan: u.lead_ghi_nhan || false };
  const today = bangkokToday();

  // Only the last 3 months of cases are needed for normal display, but cases
  // still awaiting resolution ('Đang xử lý') must stay visible however old
  // they are, so the two sets are fetched separately and merged below.
  const makeRecentCases = () => {
    let q = supabase.from('case').select('*').gte('startDate', monthsAgo(3));
    if (user.role === 'emp') q = q.eq('pic', user.name);
    else if (user.role === 'hod') q = q.eq('hod', user.name);
    return q;
  };

  const makeOpenCases = () => {
    let q = supabase.from('case').select('*').eq('status', 'Đang xử lý');
    if (user.role === 'emp') q = q.eq('pic', user.name);
    else if (user.role === 'hod') q = q.eq('hod', user.name);
    return q;
  };

  const mergeCases = (recent, open) => {
    const byId = new Map(recent.map((c) => [c.id, c]));
    open.forEach((c) => byId.set(c.id, c));
    return [...byId.values()];
  };

  // Pre-fetch team members for hod so the inspection query can use kstt filter
  // (same logic as ViolationReport). empRes in the main batch covers the same
  // data but is fetched in parallel and cannot be used there directly.
  let hodEmpNames = [];
  if (user.role === 'hod' && !user.leadGhiNhan && user.hod) {
    const { data: preEmpData } = await supabase.from('app_user').select('name').eq('hod', user.hod);
    hodEmpNames = (preEmpData || []).map((r) => r.name).filter(Boolean);
  }

  const makeInspections = () => {
    let q = supabase.from('inspections').select('*');
    if (!user.leadGhiNhan) {
      if (user.role === 'emp') {
        q = q.ilike('kstt', user.name);
      } else if (user.role === 'hod') {
        const ksttList = [...new Set([user.name, ...hodEmpNames])];
        q = q.in('kstt', ksttList);
      } else {
        q = q.ilike('user', user.id);
      }
    }
    return q;
  };

  const [recentCases, openCases, inspections, calendar, visitPlan, empRes, setupRes, nhomRes] = await Promise.all([
    fetchAllRows(makeRecentCases),
    fetchAllRows(makeOpenCases),
    fetchAllRows(makeInspections),
    fetchAllRows(() => supabase.from('calendar').select('*').ilike('user', user.id)),
    fetchAllRows(() => supabase.from('visit_plan').select('*').ilike('user', user.id).gte('date', today)),
    supabase.from('app_user').select('name').eq('hod', user.hod),
    supabase.from('setup').select('list,value,pos').order('pos'),
    supabase.from('nhom_ghi_nhan').select('*').order('STT'),
  ]);

  const cases = mergeCases(recentCases, openCases);

  const emps = (empRes.data || []).map((r) => r.name).filter(Boolean);

  const setup = { audits: [], types: [], groups: [], penalties: [] };
  (setupRes.data || []).forEach((r) => {
    if (setup[r.list]) setup[r.list].push(r.value);
  });

  const nhomGhiNhan = (nhomRes.data || []).map((r) => ({
    nhom: r['Nhóm hành vi'],
    hanhVi: r['Hành vi'],
  }));

  return { user, cases, inspections, calendar, visitPlan, emps, setup: { ...setup, nhomGhiNhan } };
}

async function findUser(username) {
  const { data, error } = await supabase.from('app_user').select('*').ilike('user', username);
  if (error) throw error;
  return (data || []).find(
    (r) => String(r.user).toLowerCase() === String(username).toLowerCase()
  );
}

// ───────────────────────── calendar (team / director) ────────────────────────

async function calendarInRange(startDate, endDate, userSet) {
  const rows = await fetchAllRows(() =>
    supabase.from('calendar').select('*').gte('date', startDate).lte('date', endDate)
  );
  return rows.filter((r) => userSet.has(String(r.user || '').toLowerCase()));
}

// ───────────────────────── public API ────────────────────────────────────────

export const api = {
  // ---- auth / bulk load ----
  login: async ({ username, password }) => {
    const u = await findUser(username);
    if (!u || String(u.password) !== String(password)) return { success: false };
    return { success: true, data: await getData(u) };
  },

  refreshData: async (userId) => {
    const u = await findUser(userId);
    if (!u) return { success: false };
    return { success: true, data: await getData(u) };
  },

  // ---- Cases (TaskManager) ----
  createCase: async (data) => {
    const id = await nextCaseId();
    const row = { ...sanitize(data, CASE_CFG), id };
    const { error } = await supabase.from('case').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  updateCase: async (data) => {
    const { error } = await supabase.from('case').update(sanitize(data, CASE_CFG)).eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteCase: async (id) => {
    const { error } = await supabase.from('case').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Inspections ----
  createInspection: async (data) => {
    const id = await nextInspectionId();
    const row = { ...sanitize(data, INSPECTION_CFG), id };
    const { error } = await supabase.from('inspections').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  updateInspection: async (data) => {
    const { error } = await supabase
      .from('inspections')
      .update(sanitize(data, INSPECTION_CFG))
      .eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteInspection: async (id) => {
    const { error } = await supabase.from('inspections').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Violation items ----
  getViolationsByInspection: async (inspectionId) => {
    const { data, error } = await supabase
      .from('violations')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('id');
    if (error) return { success: false, message: error.message };
    return { success: true, data: data || [] };
  },
  createViolationItem: async (data) => {
    const row = sanitize(data, VIOLATION_ITEM_CFG);
    delete row.id;
    const { data: inserted, error } = await supabase
      .from('violations')
      .insert(row)
      .select('id')
      .single();
    return error ? { success: false, message: error.message } : { success: true, data: inserted.id };
  },
  updateViolationItem: async (data) => {
    const row = sanitize(data, VIOLATION_ITEM_CFG);
    const { error } = await supabase.from('violations').update(row).eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteViolationItem: async (id) => {
    const { error } = await supabase.from('violations').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Violation Report (inspections + violations joined) ----
  getKsttHodMap: async () => {
    const { data, error } = await supabase.from('app_user').select('name, hod');
    if (error) return { success: false };
    const map = {};
    (data || []).forEach((r) => { if (r.name) map[r.name] = r.hod || '—'; });
    return { success: true, data: map };
  },

  getInspectionsForReport: async ({ startDate, endDate, role, userName, emps, leadGhiNhan }) => {
    let q = supabase
      .from('inspections')
      .select('*, violations(*)')
      .gte('ngayKiemTra', startDate)
      .lte('ngayKiemTra', endDate)
      .order('ngayKiemTra', { ascending: false });
    if (!leadGhiNhan) {
      if (role === 'emp') q = q.eq('kstt', userName);
      else if (role === 'hod') q = q.in('kstt', [...new Set([userName, ...emps])]);
    }
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },

  // ---- TH Nhóm 1 & Nhóm Khác ----
  getThNhom1: async ({ role, userName, emps, startDate, endDate }) => {
    let q = supabase.from('th_nhom_1').select('*').order('approved_date', { ascending: false });
    if (startDate) q = q.gte('approved_date', startDate);
    if (endDate)   q = q.lte('approved_date', endDate);
    if (role === 'emp') q = q.eq('kstt_submitted', userName);
    else if (role === 'hod') q = q.in('kstt_submitted', [...new Set([userName, ...emps])]);
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  getThNhomKhac: async ({ role, userName, emps, startDate, endDate }) => {
    let q = supabase.from('th_nhom_khac').select('*').order('approved_date', { ascending: false });
    if (startDate) q = q.gte('approved_date', startDate);
    if (endDate)   q = q.lte('approved_date', endDate);
    if (role === 'emp') q = q.eq('kstt_submitted', userName);
    else if (role === 'hod') q = q.in('kstt_submitted', [...new Set([userName, ...emps])]);
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },

  // ---- XLVP Lead: th_nhom_1 & th_nhom_khac (all rows, no role filter) ----
  getAllThNhom1: async ({ startDate, endDate } = {}) => {
    let q = supabase.from('th_nhom_1').select('*').order('approved_date', { ascending: false });
    if (startDate) q = q.gte('approved_date', startDate);
    if (endDate)   q = q.lte('approved_date', endDate);
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  getAllThNhomKhac: async ({ startDate, endDate } = {}) => {
    let q = supabase.from('th_nhom_khac').select('*').order('approved_date', { ascending: false });
    if (startDate) q = q.gte('approved_date', startDate);
    if (endDate)   q = q.lte('approved_date', endDate);
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },

  getThNhom1ById: async (id) => {
    const { data, error } = await supabase.from('th_nhom_1').select('*').eq('id', id).maybeSingle();
    return error ? { success: false, message: error.message } : { success: true, data };
  },
  getThNhomKhacById: async (id) => {
    const { data, error } = await supabase.from('th_nhom_khac').select('*').eq('id', id).maybeSingle();
    return error ? { success: false, message: error.message } : { success: true, data };
  },

  // ---- TH XLVP records linked to a case (sự vụ) ----
  getThRecordsByCase: async (caseId) => {
    const [r1, r2] = await Promise.all([
      supabase.from('th_nhom_1').select('*').eq('case_id', caseId).order('approved_date', { ascending: false }),
      supabase.from('th_nhom_khac').select('*').eq('case_id', caseId).order('approved_date', { ascending: false }),
    ]);
    if (r1.error) return { success: false, message: r1.error.message };
    if (r2.error) return { success: false, message: r2.error.message };
    const nhom1 = (r1.data || []).map((r) => ({ ...r, group: 'Nhóm 1' }));
    const nhomKhac = (r2.data || []).map((r) => ({ ...r, group: 'Nhóm khác' }));
    return { success: true, data: [...nhom1, ...nhomKhac] };
  },
  updateThNhom1: async (id, fields) => {
    const { error } = await supabase.from('th_nhom_1').update(fields).eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  updateThNhomKhac: async (id, fields) => {
    const { error } = await supabase.from('th_nhom_khac').update(fields).eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteThNhom1: async (id) => {
    const { error } = await supabase.from('th_nhom_1').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteThNhomKhac: async (id) => {
    const { error } = await supabase.from('th_nhom_khac').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  bulkSetTrinh: async (table, ids) => {
    const field = table === 'th_nhom_1' ? 'Note' : 'status';
    const { error } = await supabase.from(table).update({ [field]: 'Đã trình' }).in('id', ids);
    return error ? { success: false, message: error.message } : { success: true };
  },
  bulkUpdateTh: async (table, rows) => {
    const errors = [];
    for (let i = 0; i < rows.length; i += 10) {
      await Promise.all(rows.slice(i, i + 10).map(async ({ id, ...fields }) => {
        if (!id) return;
        const { error } = await supabase.from(table).update(fields).eq('id', id);
        if (error) errors.push({ id, message: error.message });
      }));
    }
    return { success: errors.length === 0, count: rows.length - errors.length, errors };
  },

  // ---- Admin: app_user ----
  adminGetUsers: async () => {
    const { data, error } = await supabase.from('app_user').select('*').order('name');
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  adminSaveUser: async (row, isNew) => {
    let error;
    if (isNew) {
      ({ error } = await supabase.from('app_user').insert(row));
    } else {
      const { user: userId, ...fields } = row;
      ({ error } = await supabase.from('app_user').update(fields).eq('user', userId));
    }
    return error ? { success: false, message: error.message } : { success: true };
  },
  adminDeleteUser: async (userId) => {
    const { error } = await supabase.from('app_user').delete().eq('user', userId);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Admin: nhom_loi ----
  adminGetNhomLoi: async () => {
    const { data, error } = await supabase.from('nhom_loi').select('id,violation,groupName').order('violation').order('id');
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  adminSaveNhomLoi: async ({ id, violation, groupName }) => {
    const { error } = id
      ? await supabase.from('nhom_loi').update({ violation, groupName }).eq('id', id)
      : await supabase.from('nhom_loi').insert({ violation, groupName });
    return error ? { success: false, message: error.message } : { success: true };
  },
  adminDeleteNhomLoi: async (id) => {
    const { error } = await supabase.from('nhom_loi').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Admin: nhom_ghi_nhan ----
  adminGetNhomGhiNhan: async () => {
    const { data, error } = await supabase.from('nhom_ghi_nhan').select('*').order('STT');
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  adminSaveNhomGhiNhan: async (row) => {
    const { error } = row.id
      ? await supabase.from('nhom_ghi_nhan').update(row).eq('id', row.id)
      : await supabase.from('nhom_ghi_nhan').insert(row);
    return error ? { success: false, message: error.message } : { success: true };
  },
  adminDeleteNhomGhiNhan: async (id) => {
    const { error } = await supabase.from('nhom_ghi_nhan').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Admin: setup ----
  adminGetSetup: async () => {
    const { data, error } = await supabase.from('setup').select('*').order('list').order('pos');
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  adminSaveSetup: async ({ id, list, value, pos }) => {
    const row = { list, value, pos: pos !== '' ? Number(pos) : null };
    const { error } = id
      ? await supabase.from('setup').update(row).eq('id', id)
      : await supabase.from('setup').insert(row);
    return error ? { success: false, message: error.message } : { success: true };
  },
  adminDeleteSetup: async (id) => {
    const { error } = await supabase.from('setup').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Store History (inspections + violations + xlvp for a specific SAP) ----
  getStoreHistory: async (sap) => {
    const [inspRes, nhom1Res, nhomKhacRes] = await Promise.all([
      supabase.from('inspections').select('*, violations(*)').ilike('sap', sap).order('ngayKiemTra', { ascending: false }),
      supabase.from('th_nhom_1').select('*').ilike('sap', `%${sap}%`).order('finished_date', { ascending: false }),
      supabase.from('th_nhom_khac').select('*').ilike('sap', `%${sap}%`).order('approved_date', { ascending: false }),
    ]);
    if (inspRes.error) return { success: false, message: inspRes.error.message };
    return {
      success: true,
      data: {
        inspections: inspRes.data || [],
        nhom1: nhom1Res.data || [],
        nhomKhac: nhomKhacRes.data || [],
      },
    };
  },

  // Word-doc generation still runs on Google Apps Script (Docs template in Drive).
  createRecord: (data) => gasFetch('createRecord', data),
  // Fire-and-forget Telegram notification after creating a new inspection.
  notify: (data) => gasFetch('notify', data),

  // ---- Visit Plans ----
  createVisitPlan: async (data) => {
    const id = await nextVisitPlanId();
    const row = { ...sanitize(data, VISITPLAN_CFG), id };
    const { error } = await supabase.from('visit_plan').insert(row);
    return error ? { success: false, message: error.message } : { success: true, data: id };
  },
  createVisitPlans: async ({ sites, ...rest }) => {
    const startId = await nextVisitPlanId();
    const rows = sites.map((site, i) => ({ ...sanitize({ ...rest, site }, VISITPLAN_CFG), id: startId + i }));
    const { error } = await supabase.from('visit_plan').insert(rows);
    return error ? { success: false, message: error.message } : { success: true, data: rows };
  },
  updateVisitPlan: async (data) => {
    const { error } = await supabase
      .from('visit_plan')
      .update(sanitize(data, VISITPLAN_CFG))
      .eq('id', data.id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  deleteVisitPlan: async (id) => {
    const { error } = await supabase.from('visit_plan').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },

  // ---- Monthly Store Visit Plan (kế hoạch đi kiểm tra CH theo tháng + bản đồ) ----
  // month: 'YYYY-MM-01' string. Scoped exactly like getInspectionsForReport
  // above (same report page): emp sees own name, hod sees own team, anyone
  // else (director/admin/leadGhiNhan) sees everything.
  getMonthlyVisitPlan: async (month, user) => {
    let q = supabase.from('store_visit_plan').select('*').eq('month', month);
    if (user && !user.leadGhiNhan) {
      if (user.role === 'emp') {
        q = q.ilike('pic', user.name || '');
      } else if (user.role === 'hod' && user.hod) {
        const { data: teamRows } = await supabase.from('app_user').select('name').eq('hod', user.hod);
        const names = [...new Set([user.name, ...(teamRows || []).map((r) => r.name).filter(Boolean)])];
        q = q.in('pic', names);
      }
    }
    const { data, error } = await q;
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },
  // rows: [{ month, sap, pic }]; upserts on (month, sap) so re-uploading the
  // same month only adds/corrects rows instead of wiping other teams' plans.
  importMonthlyVisitPlan: async (rows) => {
    if (!rows?.length) return { success: true, count: 0 };
    const payload = rows.map((r) => sanitize(r, MONTHLY_VISIT_PLAN_CFG));
    const { error } = await supabase.from('store_visit_plan').upsert(payload, { onConflict: 'month,sap' });
    return error ? { success: false, message: error.message } : { success: true, count: payload.length };
  },
  deleteMonthlyVisitPlanRow: async (id) => {
    const { error } = await supabase.from('store_visit_plan').delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },
  // Lookup coords/name for a set of store codes (for plotting on the map).
  // `inspections.sap` and `store_visit_plan.sap` are sometimes lowercase while
  // `stores.store` is uppercase, so match both cases — `.in()` is case-sensitive.
  getStoresBySap: async (saps) => {
    if (!saps?.length) return { success: true, data: [] };
    const variants = [...new Set(saps.flatMap((s) => [s, s.toUpperCase(), s.toLowerCase()]))];
    const { data, error } = await supabase
      .from('stores')
      .select('store, store_name, address, lat, long, chuoi')
      .in('store', variants);
    return error ? { success: false, message: error.message } : { success: true, data: data || [] };
  },

  // ---- Calendar ----
  updateWork: async (submitArray) => {
    for (const item of submitArray) {
      const row = { ...sanitize(item, CALENDAR_CFG), user: String(item.user).toLowerCase() };
      const { data: updated, error: updErr } = await supabase
        .from('calendar')
        .update(row)
        .eq('date', row.date)
        .ilike('user', row.user)
        .select('date');
      if (updErr) return { success: false, message: updErr.message };
      if (!updated || updated.length === 0) {
        const { error: insErr } = await supabase.from('calendar').insert(row);
        if (insErr) {
          if (insErr.code === '23505') {
            const { error: retryErr } = await supabase
              .from('calendar').update(row).eq('date', row.date).ilike('user', row.user);
            if (retryErr) return { success: false, message: retryErr.message };
          } else {
            return { success: false, message: insErr.message };
          }
        }
      }
    }
    return { success: true };
  },

  getTeamCalendar: async ({ hodName, startDate, endDate }) => {
    const { data: empRows, error } = await supabase
      .from('app_user').select('user,name').eq('hod', hodName).eq('role', 'emp');
    if (error) return { success: false, message: error.message };
    const emps = (empRows || []).map((r) => ({ user: r.user, name: r.name }));
    const userSet = new Set(emps.map((e) => String(e.user).toLowerCase()));
    const calendar = userSet.size ? await calendarInRange(startDate, endDate, userSet) : [];
    return { success: true, data: { emps, calendar } };
  },

  getAllCalendar: async ({ directorName, startDate, endDate }) => {
    const { data: empRows, error } = await supabase
      .from('app_user').select('user,name,role').eq('director', directorName);
    if (error) return { success: false, message: error.message };
    const emps = (empRows || [])
      .filter((r) => r.role !== 'director')
      .map((r) => ({ user: r.user, name: r.name }));
    const userSet = new Set(emps.map((e) => String(e.user).toLowerCase()));
    const calendar = userSet.size ? await calendarInRange(startDate, endDate, userSet) : [];
    return { success: true, data: { emps, calendar } };
  },

  // ---- Store Import (replace all) ----
  importStores: async (rows) => {
    const toNum  = (v) => (v == null || v === '') ? null : (isNaN(Number(v)) ? null : Number(v));
    const toStr  = (v) => (v == null || v === '') ? null : String(v).trim() || null;

    const mapped = rows
      .map((r) => ({
        store:         String(r.store ?? '').trim(),
        store_name:    toStr(r.store_name),
        lat:           toNum(r.lat),
        long:          toNum(r.long),
        address:       toStr(r.address),
        CHT:           toStr(r.cht),
        'SDT CHT':     toNum(r.sdt_cht),
        QLKV:          toStr(r.qlkv),
        'SDT QLKV':    toNum(r.sdt_qlkv),
        'QLKV id':     toStr(r.qlkv_id),
        'GDV id':      toStr(r.gdv_id),
        GDV:           toStr(r.gdv),
        'GDM id':      toStr(r.gdm_id),
        GDM:           toStr(r.gdm),
        'GDC id':      toStr(r.gdc_id),
        GDC:           toStr(r.gdc),
        kstt:          toStr(r.kstt),
        chuoi:         toStr(r.chuoi),
        'TBP An ninh': toStr(r.tbp_an_ninh),
        'CV An ninh':  toStr(r.cv_an_ninh),
      }))
      .filter((r) => r.store);

    const { error: delErr } = await supabase.from('stores').delete().neq('store', '');
    if (delErr) return { success: false, message: delErr.message };

    const BATCH = 500;
    for (let i = 0; i < mapped.length; i += BATCH) {
      const { error } = await supabase.from('stores').insert(mapped.slice(i, i + BATCH));
      if (error) return { success: false, message: error.message };
    }
    return { success: true, count: mapped.length };
  },

  // ---- Store Search ----
  searchStore: async ({ site, siteName, siteAdd }) => {
    let q = supabase.from('stores').select('*');
    if (site) q = q.ilike('store', `%${site}%`);
    if (siteName) q = q.ilike('store_name', `%${siteName}%`);
    if (siteAdd) q = q.ilike('address', `%${siteAdd}%`);
    const { data, error } = await q.limit(100);
    if (error) return { result: [] };
    const result = (data || []).map((r) => ({
      site: r.store,
      siteName: r.store_name,
      address: r.address,
      CHT: r.CHT,
      CHTPhone: r['SDT CHT'],
      QLKV: r.QLKV,
      GDV: r.GDV,
      KSTT: r.kstt,
      lat: r.lat,
      long: r.long,
      chuoi: r.chuoi,
      tbpAnNinh: r['TBP An ninh'],
      cvAnNinh: r['CV An ninh'],
    }));
    return { result };
  },
};
