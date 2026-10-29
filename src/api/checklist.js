import { supabase } from './supabaseClient';
import { ALL_FIELDS, HEADER_COLUMNS } from '../pages/checklist/checklistSchema';

const TABLE = 'ancs_checklist';
const PAGE_SIZE = 1000;
const COLUMNS = [...HEADER_COLUMNS, ...ALL_FIELDS.map((f) => f.key)];

// '' → null; ép số cho field int; field đang bị ẩn (showIf) được xóa về null.
function toRow(form) {
  const row = {};
  for (const f of ALL_FIELDS) {
    if (f.showIf && !f.showIf(form)) { row[f.key] = null; continue; }
    const v = form[f.key];
    if (f.type === 'int') row[f.key] = v === '' || v == null || isNaN(Number(v)) ? null : Number(v);
    else if (f.type === 'photos') row[f.key] = Array.isArray(v) && v.length ? v : null;
    else row[f.key] = v === '' || v == null ? null : v;
  }
  for (const c of HEADER_COLUMNS) row[c] = form[c] === '' ? null : form[c];
  return row;
}

export const checklistApi = {
  // names: null = xem tất cả; mảng = chỉ các CVAN trong danh sách
  list: async ({ names, dateFrom, dateTo }) => {
    const all = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let q = supabase.from(TABLE).select(['id', 'created_at', ...COLUMNS].join(','));
      if (names) q = q.in('cvan_name', names);
      if (dateFrom) q = q.gte('created_at', `${dateFrom}T00:00:00+07:00`);
      if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59+07:00`);
      const { data, error } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) return { success: false, message: error.message };
      all.push(...(data || []));
      if (!data || data.length < PAGE_SIZE) break;
    }
    return { success: true, data: all };
  },

  create: async (form) => {
    const { data, error } = await supabase.from(TABLE).insert(toRow(form)).select().single();
    return error ? { success: false, message: error.message } : { success: true, data };
  },

  update: async (id, form) => {
    const { data, error } = await supabase
      .from(TABLE).update({ ...toRow(form), updated_at: new Date().toISOString() }).eq('id', id).select().single();
    return error ? { success: false, message: error.message } : { success: true, data };
  },

  remove: async (id) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return error ? { success: false, message: error.message } : { success: true };
  },
};
