import { supabase } from './supabaseClient';
import { USER_TABLE, findAncsUser, roleOf, verifyLogin } from './ancsUsers';

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
  const user = {
    id: u.username, name: u.full_name, title: u.title, role: roleOf(u.title),
    manager: u.manager, isAdmin: u.title !== 'chuyen_vien',
  };
  const today = bangkokToday();

  // Chuyên viên dưới quyền trưởng bộ phận
  let emps = [];
  if (u.title === 'truong_bo_phan') {
    const { data } = await supabase.from(USER_TABLE).select('full_name').eq('manager', u.username);
    emps = (data || []).map((r) => r.full_name).filter(Boolean);
  }

  const visitPlan = await fetchAllRows(() =>
    supabase.from('visit_plan').select('*').ilike('user', user.id).gte('date', today)
  );

  return { user, visitPlan, emps };
}

// ───────────────────────── public API ────────────────────────────────────────

export const api = {
  // ---- auth / bulk load ----
  login: async ({ username, password }) => {
    const u = await verifyLogin(username, password);
    if (!u) return { success: false };
    return { success: true, data: await getData(u) };
  },

  refreshData: async (userId) => {
    const u = await findAncsUser(userId);
    if (!u || !u.active) return { success: false };
    return { success: true, data: await getData(u) };
  },

  // ---- Cases (TaskManager) ----
  // ---- Inspections ----
  // ---- Violation items ----
  // ---- TH XLVP records linked to a case (sự vụ) ----
  // ---- Admin: app_user ----
  // ---- Admin: nhom_loi ----
  // ---- Admin: nhom_ghi_nhan ----
  // ---- Admin: setup ----
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
  // Fire-and-forget Telegram notification after creating a new inspection.
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
  // rows: [{ month, sap, pic }]; upserts on (month, sap) so re-uploading the
  // same month only adds/corrects rows instead of wiping other teams' plans.
  // Lookup coords/name for a set of store codes (for plotting on the map).
  // `inspections.sap` and `store_visit_plan.sap` are sometimes lowercase while
  // `stores.store` is uppercase, so match both cases — `.in()` is case-sensitive.
  // ---- Calendar ----


  // ---- Store Import (replace all) ----
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
