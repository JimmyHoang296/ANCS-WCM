import { supabase } from './supabaseClient';

export const USER_TABLE = 'ancs-user';

export const TITLES = {
  truong_phong: 'Trưởng phòng',
  truong_bo_phan: 'Trưởng bộ phận',
  chuyen_vien: 'Chuyên viên an ninh',
};

// Map chức danh sang role mà các trang Ghi nhận / Lịch BM đang dùng.
export const roleOf = (title) => (title === 'chuyen_vien' ? 'emp' : 'hod');

// Hash = SHA-256("salt:password"). Chỉ ngăn lộ mật khẩu thô trong DB; đăng nhập vẫn
// kiểm tra phía client nên cần RLS / edge function nếu muốn bảo mật thật sự.
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const newSalt = () =>
  [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');

async function credentials(password) {
  const salt = newSalt();
  return { salt, password_hash: await sha256(`${salt}:${password}`) };
}

export async function findAncsUser(username) {
  const { data, error } = await supabase
    .from(USER_TABLE).select('*').eq('username', String(username).trim().toLowerCase()).maybeSingle();
  if (error) throw error;
  return data;
}

export async function verifyLogin(username, password) {
  const u = await findAncsUser(username);
  if (!u || !u.active) return null;
  const hash = await sha256(`${u.salt}:${password}`);
  return hash === u.password_hash ? u : null;
}

export async function listUsers() {
  const { data, error } = await supabase.from(USER_TABLE).select('*').order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createUser({ username, fullName, title, manager, password, createdBy }) {
  const row = {
    username: username.trim().toLowerCase(),
    full_name: fullName.trim(),
    title,
    manager: manager || null,
    active: true,
    created_by: createdBy,
    ...(await credentials(password)),
  };
  const { error } = await supabase.from(USER_TABLE).insert(row);
  if (error) {
    return { success: false, message: error.code === '23505' ? 'Tên đăng nhập đã tồn tại.' : error.message };
  }
  return { success: true };
}

export async function updateUser(username, fields) {
  const { error } = await supabase.from(USER_TABLE).update(fields).eq('username', username);
  return error ? { success: false, message: error.message } : { success: true };
}

export async function resetPassword(username, password) {
  return updateUser(username, await credentials(password));
}
