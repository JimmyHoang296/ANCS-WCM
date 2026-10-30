-- Thêm 2 cột cho bảng visit_plan (dùng chung với dự án KSTT). Chạy 1 lần trong Supabase SQL Editor.
--
-- chuc_vu : đơn vị đăng ký, 'ANCS' hoặc 'KSTT'. Default 'KSTT' nên các dòng cũ và
--           các dòng app KSTT chèn mới (không gửi cột này) đều tự thành 'KSTT'.
-- loai_ch : tự tính từ mã CH — mã bắt đầu bằng '1' là Siêu thị, còn lại là Cửa hàng.
--           Là cột generated nên không cần (và không được) ghi từ ứng dụng.

alter table visit_plan
  add column if not exists chuc_vu text not null default 'KSTT';

alter table visit_plan
  add column if not exists loai_ch text
  generated always as (
    case when btrim(site) like '1%' then 'Siêu thị' else 'Cửa hàng' end
  ) stored;
