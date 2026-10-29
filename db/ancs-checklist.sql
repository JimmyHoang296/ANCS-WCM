-- Sinh tự động từ src/pages/checklist/checklistSchema.js — không sửa tay, hãy chạy lại: node db/gen-checklist-sql.mjs
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
  bien_canh_bao        text,  -- Cửa hàng có dán biển cảnh báo "Khách hàng tự bảo quản tài sản" không?
  hinh_bien_canh_bao   text[],  -- Hình ảnh biển cảnh báo (chụp ảnh có timeline)
  vu_trom_ngoai        text,  -- Số vụ trộm cắp do đối tượng bên ngoài
  vu_noi_bo            text,  -- Số vụ trộm cắp, tiêu cực, gian lận, thông đồng do CBNV
  vu_mat_xe            text,  -- Số vụ mất xe
  vu_dot_nhap          text,  -- Số vụ đột nhập
  vu_mat_antt          text,  -- Số vụ mất An ninh trật tự
  vu_mat_atld          text,  -- Số vụ mất An toàn lao động
  vu_mat_pccc          text,  -- Số vụ mất an toàn phòng cháy chữa cháy
  su_vu_mo_ta          text,  -- Thông tin sơ bộ về các sự vụ (thời gian, nguyên nhân, thiệt hại, hướng xử lý...)
  ket_loai             text,  -- Loại két sắt đang sử dụng
  ket_vi_tri           text,  -- Vị trí đặt két sắt
  ket_khoa             text,  -- Khóa và mật mã vẫn còn sử dụng tốt
  ket_camera           text,  -- Đặt ở vị trí có camera quan sát
  ket_chia_khoa        text,  -- CHT kiểm soát việc lưu trữ, bàn giao chìa khóa két sắt
  ket_loi              text,  -- Ghi rõ lỗi két sắt không đạt
  cua_chinh            text,  -- Cửa chính
  cua_kinh             text,  -- Cửa kính
  cua_phu              text,  -- Cửa phụ, cửa hậu, cửa ngách
  cua_ban_cong         text,  -- Cửa ban công, cửa thông tầng, cửa tum
  cua_loi              text,  -- Ghi rõ lỗi hệ thống cửa không đạt
  cua_loai             text,  -- Cửa chính là loại cửa gì
  khoa_loai            text,  -- Loại khóa đang sử dụng
  tu_dien_vi_tri       text,  -- Vị trí tủ điện 3 pha
  khu_vuc_an_ninh      text,  -- Đánh giá tình hình An ninh khu vực
  khu_vuc_ghi_chu      text,  -- Vấn đề phức tạp của khu vực
  atld_kho             text,  -- Sắp xếp hàng hóa trong kho
  atld_quay            text,  -- Sắp xếp hàng hóa trên quầy
  atld_nv              text,  -- Nhân viên CH tuân thủ quy định vệ sinh an toàn lao động
  atld_khac            text,  -- Các nội dung ATLĐ khác
  atld_loi             text,  -- Ghi rõ lỗi ATLĐ không đảm bảo
  hinh_atld            text[],  -- Hình ảnh hạng mục ATLĐ không đảm bảo (tối đa 3 ảnh)
  pccc_binh_bot        text,  -- Bình PCCC bột
  pccc_binh_khi        text,  -- Bình PCCC khí
  pccc_dien            text,  -- Hệ thống điện, dây dẫn
  pccc_exit            text,  -- Đèn Exit, chiếu sáng sự cố
  pccc_noi_quy         text,  -- Biển, bảng nội quy tiêu lệnh PCCC dán nơi dễ thấy, không bị che chắn
  pccc_khac            text,  -- Nội dung an toàn PCCC khác
  pccc_loi             text,  -- Ghi rõ lỗi PCCC không đảm bảo
  hinh_pccc            text[],  -- Hình ảnh hạng mục PCCC không đảm bảo (tối đa 3 ảnh)
  sl_binh_bot          integer,  -- Số lượng bình PCCC bột
  sl_binh_khi          integer,  -- Số lượng bình PCCC khí
  sl_camera            integer,  -- Số lượng camera
  sl_dau_ghi           integer,  -- Số lượng đầu ghi
  dau_ghi_hang         text,  -- Hãng đầu ghi
  dau_ghi_hang_khac    text,  -- Tên hãng khác
  dau_ghi_cong         text,  -- Chủng loại đầu ghi
  camera_he_thong      text,  -- Hệ thống camera đang sử dụng
  camera_so_ngay_luu   integer,  -- Số ngày camera đang lưu trữ
  camera_danh_gia      text,  -- Đánh giá hệ thống camera
  camera_loi           text,  -- Ghi rõ lỗi camera không đảm bảo
  nv_tu_van            text,  -- Nhiệt tình tư vấn, giải đáp thắc mắc và hỗ trợ khách hàng
  nv_ky_luat           text,  -- Không tụ tập, nói chuyện, làm việc riêng trong giờ
  nv_khoa_xe           text,  -- Khóa xe của bản thân và nhắc nhở khách hàng khóa xe đầy đủ
  nv_giao_tiep         text,  -- Giao tiếp: chủ động cười, chào, cảm ơn khách
  nv_dien_mao          text,  -- Diện mạo, đồng phục, biển tên theo quy định
  nv_vi_pham           text,  -- Họ tên nhân viên và lỗi vi phạm cụ thể
  co_bao_ve            text,  -- Cửa hàng có bố trí bảo vệ không
  bv_vi_tri            text,  -- Luôn có mặt tại vị trí theo phương án
  bv_kiem_soat         text,  -- Chủ động kiểm soát người và phương tiện ra vào
  bv_dong_phuc         text,  -- Đồng phục đúng quy định, quần áo sạch sẽ, giày đánh sạch
  bv_tu_the            text,  -- Tư thế đứng, ngồi kiểm soát đúng quy định
  bv_dien_mao          text,  -- Diện mạo gọn gàng, sạch sẽ
  bv_giao_tiep         text,  -- Giao tiếp với khách hàng (chủ động, cười, chào, cảm ơn)
  bv_ho_tro            text,  -- Hỗ trợ khách hàng (bê đồ, dắt xe, mở cửa xe, cửa kính...)
  bv_xe                text,  -- Hướng dẫn, sắp xếp xe ngay ngắn, giúp đỡ khách khi ra vào
  bv_ky_luat           text,  -- Không tụ tập, nói chuyện, làm việc riêng trong giờ
  hinh_bao_ve          text[],  -- Hình ảnh bảo vệ không đạt (tối đa 3 ảnh)
  bv_vi_pham           text,  -- Họ tên nhân viên bảo vệ không tuân thủ
  updated_at        timestamptz
);

create index if not exists ancs_checklist_sap_idx on ancs_checklist (sap);
create index if not exists ancs_checklist_created_idx on ancs_checklist (created_at desc);
create index if not exists ancs_checklist_cvan_idx on ancs_checklist (cvan_name);

-- App dùng anon key (giống bảng ancs-user), nên cấp quyền cho anon.
grant select, insert, update, delete on ancs_checklist to anon;
alter table ancs_checklist disable row level security;
