-- Chạy trong Supabase → SQL Editor.
create table if not exists "ancs-user" (
  username      text primary key,                 -- chữ thường, dùng để đăng nhập
  full_name     text not null,                    -- trùng tên KSTT trong bảng inspections
  title         text not null check (title in ('truong_phong','truong_bo_phan','chuyen_vien')),
  manager       text references "ancs-user"(username) on update cascade, -- chuyên viên → trưởng bộ phận
  password_hash text not null,
  salt          text not null,
  active        boolean not null default true,
  created_by    text,
  created_at    timestamptz not null default now()
);

-- App dùng anon key (giống bảng app_user hiện tại), nên cấp quyền cho anon.
grant select, insert, update on "ancs-user" to anon;
alter table "ancs-user" disable row level security;

-- Tài khoản trưởng phòng đầu tiên. KHÔNG commit mật khẩu hay hash vào git.
-- 1) Tạo salt + hash (thay MAT_KHAU bằng mật khẩu bạn chọn):
--      node -e "const c=require('crypto');const s=c.randomBytes(8).toString('hex');console.log(s,c.createHash('sha256').update(s+':MAT_KHAU').digest('hex'))"
-- 2) Điền hai giá trị vừa in ra (salt rồi hash) rồi chạy:
-- insert into "ancs-user" (username, full_name, title, password_hash, salt, created_by)
-- values ('admin', 'Trưởng phòng', 'truong_phong', '<hash>', '<salt>', 'system');
