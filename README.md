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
