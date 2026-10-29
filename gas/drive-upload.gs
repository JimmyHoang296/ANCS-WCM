/**
 * Web app nhận ảnh từ ANCS Manager và lưu vào Google Drive của người triển khai.
 *
 * Thiết lập: xem README.md → mục "Upload ảnh lên Google Drive".
 * Script Properties cần có:
 *   FOLDER_ID    – ID thư mục Drive gốc chứa ảnh (phần cuối URL của thư mục)
 *   UPLOAD_TOKEN – chuỗi bí mật, trùng VITE_DRIVE_UPLOAD_TOKEN của app
 */
const MAX_BYTES = 8 * 1024 * 1024;

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const req = JSON.parse(e.postData.contents);

    if (!req.token || req.token !== props.getProperty('UPLOAD_TOKEN')) return reply({ success: false, message: 'Không có quyền' });
    if (!/^image\//.test(req.mimeType || '')) return reply({ success: false, message: 'Chỉ nhận ảnh' });

    const bytes = Utilities.base64Decode(req.data);
    if (bytes.length > MAX_BYTES) return reply({ success: false, message: 'Ảnh quá lớn' });

    // Mỗi tháng một thư mục con: yyyy-MM
    const root = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    const name = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');
    const subs = root.getFoldersByName(name);
    const folder = subs.hasNext() ? subs.next() : root.createFolder(name);

    const file = folder.createFile(Utilities.newBlob(bytes, req.mimeType, String(req.filename || 'image.jpg').slice(0, 120)));
    // Cần "ai có link đều xem được" để ảnh hiển thị trong app
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return reply({ success: true, id: file.getId(), url: 'https://drive.google.com/open?id=' + file.getId() });
  } catch (err) {
    return reply({ success: false, message: String(err) });
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
