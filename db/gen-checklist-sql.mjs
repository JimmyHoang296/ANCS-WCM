// Sinh db/ancs-checklist.sql từ src/pages/checklist/checklistSchema.js
//   node db/gen-checklist-sql.mjs
import { writeFileSync } from 'node:fs';
import { SECTIONS } from '../src/pages/checklist/checklistSchema.js';

const sqlType = { select: 'text', text: 'text', textarea: 'text', int: 'integer', photos: 'text[]' };

const cols = SECTIONS.flatMap((s) =>
  s.fields.map((f) => `  ${f.key.padEnd(20)} ${sqlType[f.type]},  -- ${f.label.replace(/\n/g, ' ')}`)
);

const sql = `-- Sinh tự động từ src/pages/checklist/checklistSchema.js — không sửa tay, hãy chạy lại: node db/gen-checklist-sql.mjs
-- Chạy trong Supabase → SQL Editor.
create table if not exists ancs_checklist (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  sap               text not null,   -- Mã SAP cơ sở kiểm tra
  store_name        text,
  cvan_user         text not null,   -- username người kiểm tra (ancs-user.username)
  cvan_name         text not null,   -- Họ và tên CVAN
  inspector_title   text,            -- Chức danh người kiểm tra
  area_cvan         text,            -- Cơ sở thuộc địa bàn phụ trách của CVAN nào
${cols.join('\n')}
  updated_at        timestamptz
);

create index if not exists ancs_checklist_sap_idx on ancs_checklist (sap);
create index if not exists ancs_checklist_created_idx on ancs_checklist (created_at desc);
create index if not exists ancs_checklist_cvan_idx on ancs_checklist (cvan_name);

-- App dùng anon key (giống bảng ancs-user), nên cấp quyền cho anon.
grant select, insert, update, delete on ancs_checklist to anon;
alter table ancs_checklist disable row level security;
`;

writeFileSync(new URL('./ancs-checklist.sql', import.meta.url), sql);
console.log('OK:', SECTIONS.flatMap((s) => s.fields).length, 'cột checklist');
