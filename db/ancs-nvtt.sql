-- Danh sách trích ngang nhân viên thu tiền (NVTT). Chạy 1 lần trong Supabase → SQL Editor.
-- Dữ liệu được nạp từ file Excel ở trang Quản trị; mỗi lần upload thay toàn bộ danh sách cũ.
create table if not exists ancs_nvtt (
  id            bigint generated always as identity primary key,
  ho_ten        text not null,           -- (1) Họ và tên
  bl_ten        text,                    -- (2) Họ tên người bảo lãnh / CBLĐ bảo lãnh
  bl_sdt        text,                    -- (3) SĐT người bảo lãnh / CBLĐ bảo lãnh
  bl_dia_chi    text,                    -- (4) Địa chỉ thường trú người bảo lãnh
  bl_chuc_danh  text,                    -- (5) Chức danh CBLĐ / SĐT
  bl_cmnd       text,                    -- (6) Cấp bậc CBLĐ bảo lãnh / CMND
  bl_quan_he    text,                    -- (7) Mối quan hệ với người được bảo lãnh
  trich_ngang   text,                    -- (8) Trích ngang chi tiết NVTT
  ancs_quan_ly  text,                    -- (9) ANCS quản lý
  batch         text not null,           -- mã đợt upload (để thay thế an toàn)
  uploaded_by   text,
  uploaded_at   timestamptz not null default now()
);

create index if not exists ancs_nvtt_batch_idx on ancs_nvtt (batch);

-- App dùng anon key như các bảng khác.
grant select, insert, delete on ancs_nvtt to anon;
alter table ancs_nvtt disable row level security;
