# ANCS Manager

Ứng dụng React + Vite (Supabase) gồm 3 tính năng: Tìm kiếm cửa hàng (`/search`), Lịch BM (`/visit-plan-management`), Ghi nhận vi phạm (`/violation-management`).

## Chạy local
```
cp .env.example .env   # điền VITE_SUPABASE_URL, VITE_SUPABASE_KEY
npm install
npm run dev
```

## Deploy lên Vercel
Import repository trên Vercel (preset Vite tự nhận), thêm 2 biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_KEY`, rồi Deploy. `vercel.json` đã có rewrite SPA.

## Cơ sở dữ liệu
Chạy trong Supabase SQL Editor: `db/ancs-user.sql` (tài khoản) và `db/ancs-checklist.sql` (checklist ANAT & PCCC).
`ancs-checklist.sql` sinh từ `src/pages/checklist/checklistSchema.js` bằng `node db/gen-checklist-sql.mjs` — sửa form thì sửa schema rồi sinh lại SQL.

## Upload ảnh lên Google Drive
Ảnh trong Checklist được gửi tới một Google Apps Script chạy bằng tài khoản Google của bạn và lưu vào thư mục Drive của bạn.
1. Tạo thư mục trên Drive (ví dụ "ANCS ảnh"), copy ID ở cuối URL thư mục.
2. Vào script.google.com → New project → dán nội dung `gas/drive-upload.gs`.
3. Project Settings → Script properties: thêm `FOLDER_ID` (ID thư mục) và `UPLOAD_TOKEN` (một chuỗi bí mật tự đặt).
4. Deploy → New deployment → Web app → *Execute as: Me*, *Who has access: Anyone* → Deploy, cấp quyền Drive, copy URL `.../exec`.
5. Đặt `VITE_DRIVE_UPLOAD_URL` = URL đó và `VITE_DRIVE_UPLOAD_TOKEN` = chuỗi ở bước 3 trong `.env` (local) và Environment Variables của Vercel, rồi redeploy.
