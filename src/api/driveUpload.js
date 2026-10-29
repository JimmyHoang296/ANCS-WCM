// Upload ảnh lên Google Drive của chủ Apps Script (xem gas/drive-upload.gs).
const UPLOAD_URL = import.meta.env.VITE_DRIVE_UPLOAD_URL;
const UPLOAD_TOKEN = import.meta.env.VITE_DRIVE_UPLOAD_TOKEN;

export const driveUploadEnabled = Boolean(UPLOAD_URL && UPLOAD_TOKEN);

const MAX_SIDE = 1600;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

// Thu nhỏ ảnh về tối đa 1600px, JPEG 0.8 — ảnh điện thoại 5–10MB còn ~300KB.
async function compress(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** @returns {Promise<{success:boolean, url?:string, message?:string}>} */
export async function uploadImageToDrive(file) {
  if (!driveUploadEnabled) return { success: false, message: 'Chưa cấu hình upload Google Drive' };
  if (!file.type.startsWith('image/')) return { success: false, message: 'Chỉ nhận file ảnh' };
  if (file.size > MAX_INPUT_BYTES) return { success: false, message: 'Ảnh quá lớn (tối đa 20MB)' };
  try {
    const data = await compress(file);
    // text/plain để tránh CORS preflight (Apps Script không trả header CORS cho OPTIONS)
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token: UPLOAD_TOKEN,
        filename: `${Date.now()}_${file.name.replace(/\.[^.]+$/, '')}.jpg`,
        mimeType: 'image/jpeg',
        data,
      }),
    });
    const json = await res.json();
    return json.success ? { success: true, url: json.url } : { success: false, message: json.message || 'Upload thất bại' };
  } catch {
    return { success: false, message: 'Không kết nối được Google Drive' };
  }
}

// Link xem ảnh dạng thumbnail từ link Drive (open?id=… hoặc /file/d/…/view)
export function driveThumb(url, size = 400) {
  const id = /[?&]id=([\w-]+)/.exec(url)?.[1] || /\/d\/([\w-]+)/.exec(url)?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${size}` : url;
}
