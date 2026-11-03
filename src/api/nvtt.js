import { supabase } from './supabaseClient';

const TABLE = 'ancs_nvtt';
const PAGE_SIZE = 1000;
const INSERT_CHUNK = 200;

// Cột trong DB ↔ tên cột trong file Excel. `match` so khớp với tiêu đề đã bỏ dấu/chữ thường
// (exact: phải trùng hoàn toàn; mặc định: tiêu đề chứa cụm này). Tìm ở 5 dòng đầu vì
// file có tiêu đề nhóm ở dòng 1 và tiêu đề cột ở dòng 2.
export const NVTT_COLUMNS = [
  { key: 'ho_ten',       label: 'Họ và tên',                           match: 'ho va ten', exact: true },
  { key: 'bl_ten',       label: 'Họ tên người bảo lãnh',               match: 'ho ten nguoi bao lanh' },
  { key: 'bl_sdt',       label: 'SĐT người bảo lãnh',                  match: 'sdt nguoi bao lanh' },
  { key: 'bl_dia_chi',   label: 'Địa chỉ thường trú người bảo lãnh',   match: 'dia chi thuong tru nguoi bao lanh' },
  { key: 'bl_chuc_danh', label: 'Chức danh CBLĐ / SĐT',                match: 'chuc danh cbld' },
  { key: 'bl_cmnd',      label: 'Cấp bậc CBLĐ / CMND',                 match: 'cap bac cbld' },
  { key: 'bl_quan_he',   label: 'Mối quan hệ với người được bảo lãnh', match: 'moi quan he' },
  { key: 'trich_ngang',  label: 'Trích ngang chi tiết NVTT',           match: 'trich ngang chi tiet' },
  { key: 'ancs_quan_ly', label: 'ANCS quản lý',                        match: 'ancs quan ly' },
];

const normHeader = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const HEADER_ROWS = 5;

const FIELDS = NVTT_COLUMNS.map((c) => c.key).join(',');

const clean = (v) => (v == null ? '' : String(v).replace(/\r\n/g, '\n').trim());

// Đọc file Excel (sheet đầu tiên): xác định cột theo tên tiêu đề, dữ liệu nằm dưới dòng tiêu đề "Họ và tên".
export async function parseNvttFile(file) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });

  const head = rows.slice(0, HEADER_ROWS).map((r) => r.map(normHeader));
  const colOf = {};
  for (const c of NVTT_COLUMNS) {
    for (let r = 0; r < head.length && !(c.key in colOf); r++) {
      const i = head[r].findIndex((h) => h && (c.exact ? h === c.match : h.includes(c.match)));
      if (i >= 0) colOf[c.key] = { col: i, row: r };
    }
  }
  const missing = NVTT_COLUMNS.filter((c) => !(c.key in colOf));
  if (missing.length) {
    throw new Error(`Không thấy cột: ${missing.map((c) => `"${c.label}"`).join(', ')}. Kiểm tra tên cột trong file.`);
  }

  // Dữ liệu bắt đầu sau dòng chứa tiêu đề "Họ và tên"; bỏ qua dòng đánh số mẫu (họ tên là số).
  return rows.slice(colOf.ho_ten.row + 1)
    .map((r) => Object.fromEntries(NVTT_COLUMNS.map((c) => [c.key, clean(r[colOf[c.key].col])])))
    .filter((r) => r.ho_ten && !/^\d+$/.test(r.ho_ten));
}

export const nvttApi = {
  list: async () => {
    const all = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase.from(TABLE).select(FIELDS).order('ho_ten').range(from, from + PAGE_SIZE - 1);
      if (error) return { success: false, message: error.message };
      all.push(...(data || []));
      if (!data || data.length < PAGE_SIZE) break;
    }
    return { success: true, data: all };
  },

  // Số dòng + thời điểm upload gần nhất
  info: async () => {
    const [{ count, error }, { data }] = await Promise.all([
      supabase.from(TABLE).select('id', { count: 'exact', head: true }),
      supabase.from(TABLE).select('uploaded_at,uploaded_by').order('uploaded_at', { ascending: false }).limit(1),
    ]);
    if (error) return { success: false, message: error.message };
    return { success: true, count: count || 0, last: data?.[0] || null };
  },

  // Thay toàn bộ danh sách: chèn đợt mới trước, thành công hết mới xóa đợt cũ.
  // Nếu chèn lỗi giữa chừng thì gỡ phần đã chèn, danh sách cũ còn nguyên.
  replaceAll: async (rows, uploadedBy) => {
    const batch = new Date().toISOString();
    const payload = rows.map((r) => ({ ...r, batch, uploaded_by: uploadedBy }));
    for (let i = 0; i < payload.length; i += INSERT_CHUNK) {
      const { error } = await supabase.from(TABLE).insert(payload.slice(i, i + INSERT_CHUNK));
      if (error) {
        await supabase.from(TABLE).delete().eq('batch', batch);
        return { success: false, message: error.message };
      }
    }
    const { error } = await supabase.from(TABLE).delete().neq('batch', batch);
    if (error) return { success: false, message: 'Đã nạp danh sách mới nhưng chưa xóa được danh sách cũ: ' + error.message };
    return { success: true, count: payload.length };
  },
};
