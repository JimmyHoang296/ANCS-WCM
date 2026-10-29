// Nguồn duy nhất mô tả checklist ANAT & PCCC (theo Google Form "TUẦN 43 CHECKLIST KIỂM TRA ANAT&PCCN").
// `key` là tên cột trong bảng ancs_checklist; db/gen-checklist-sql.mjs sinh SQL từ file này.
//   type: select | text | textarea | int | photos
//   showIf(form): ẩn field khi trả về false

const DAT = ['Đạt', 'Không đạt'];
const DAM_BAO = ['Đảm bảo', 'Không đảm bảo'];
const DAM_BAO_KHONG_CO = ['Đảm bảo', 'Không đảm bảo', 'Không có'];
const SO_VU = ['Không có', '01 vụ', '02 vụ', '03 vụ', '>03 vụ'];

export const INSPECTOR_TITLES = ['Chuyên viên An ninh', 'Chuyên viên Giám sát cơ sở'];

const hasFault = (form, keys) => keys.some((k) => form[k] === 'Không đạt' || form[k] === 'Không đảm bảo');

export const SECTIONS = [
  {
    title: 'Biển cảnh báo',
    fields: [
      { key: 'bien_canh_bao', label: 'Cửa hàng có dán biển cảnh báo "Khách hàng tự bảo quản tài sản" không?', type: 'select', options: ['Có', 'Không'], required: true,
        hint: 'Nếu không có, yêu cầu CH in giấy A4 dán tạm thời và đặt in theo tiêu chuẩn' },
      { key: 'hinh_bien_canh_bao', label: 'Hình ảnh biển cảnh báo (chụp ảnh có timeline)', type: 'photos', max: 3 },
    ],
  },
  {
    title: 'Tình hình ANAT trong tháng',
    fields: [
      { key: 'vu_trom_ngoai', label: 'Số vụ trộm cắp do đối tượng bên ngoài', type: 'select', options: SO_VU, required: true },
      { key: 'vu_noi_bo', label: 'Số vụ trộm cắp, tiêu cực, gian lận, thông đồng do CBNV', type: 'select', options: SO_VU, required: true },
      { key: 'vu_mat_xe', label: 'Số vụ mất xe', type: 'select', options: SO_VU, required: true },
      { key: 'vu_dot_nhap', label: 'Số vụ đột nhập', type: 'select', options: SO_VU, required: true },
      { key: 'vu_mat_antt', label: 'Số vụ mất An ninh trật tự', type: 'select', options: SO_VU, required: true },
      { key: 'vu_mat_atld', label: 'Số vụ mất An toàn lao động', type: 'select', options: SO_VU, required: true },
      { key: 'vu_mat_pccc', label: 'Số vụ mất an toàn phòng cháy chữa cháy', type: 'select', options: SO_VU, required: true },
      { key: 'su_vu_mo_ta', label: 'Thông tin sơ bộ về các sự vụ (thời gian, nguyên nhân, thiệt hại, hướng xử lý...)', type: 'textarea',
        showIf: (f) => ['vu_trom_ngoai', 'vu_noi_bo', 'vu_mat_xe', 'vu_dot_nhap', 'vu_mat_antt', 'vu_mat_atld', 'vu_mat_pccc'].some((k) => f[k] && f[k] !== 'Không có') },
    ],
  },
  {
    title: 'Két sắt',
    fields: [
      { key: 'ket_loai', label: 'Loại két sắt đang sử dụng', type: 'text' },
      { key: 'ket_vi_tri', label: 'Vị trí đặt két sắt', type: 'text' },
      { key: 'ket_khoa', label: 'Khóa và mật mã vẫn còn sử dụng tốt', type: 'select', options: DAT, required: true },
      { key: 'ket_camera', label: 'Đặt ở vị trí có camera quan sát', type: 'select', options: DAT, required: true },
      { key: 'ket_chia_khoa', label: 'CHT kiểm soát việc lưu trữ, bàn giao chìa khóa két sắt', type: 'select', options: DAT, required: true },
      { key: 'ket_loi', label: 'Ghi rõ lỗi két sắt không đạt', type: 'textarea', showIf: (f) => hasFault(f, ['ket_khoa', 'ket_camera', 'ket_chia_khoa']) },
    ],
  },
  {
    title: 'Hệ thống cửa & khu vực',
    fields: [
      { key: 'cua_chinh', label: 'Cửa chính', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'cua_kinh', label: 'Cửa kính', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'cua_phu', label: 'Cửa phụ, cửa hậu, cửa ngách', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'cua_ban_cong', label: 'Cửa ban công, cửa thông tầng, cửa tum', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'cua_loi', label: 'Ghi rõ lỗi hệ thống cửa không đạt', type: 'textarea', showIf: (f) => hasFault(f, ['cua_chinh', 'cua_kinh', 'cua_phu', 'cua_ban_cong']) },
      { key: 'cua_loai', label: 'Cửa chính là loại cửa gì', type: 'text' },
      { key: 'khoa_loai', label: 'Loại khóa đang sử dụng', type: 'text' },
      { key: 'tu_dien_vi_tri', label: 'Vị trí tủ điện 3 pha', type: 'text' },
      { key: 'khu_vuc_an_ninh', label: 'Đánh giá tình hình An ninh khu vực', type: 'select', options: ['Khu vực An ninh cơ bản an toàn', 'Khu vực An ninh phức tạp'], required: true },
      { key: 'khu_vuc_ghi_chu', label: 'Vấn đề phức tạp của khu vực', type: 'textarea', showIf: (f) => f.khu_vuc_an_ninh === 'Khu vực An ninh phức tạp' },
    ],
  },
  {
    title: 'An toàn lao động',
    fields: [
      { key: 'atld_kho', label: 'Sắp xếp hàng hóa trong kho', type: 'select', options: DAM_BAO, required: true },
      { key: 'atld_quay', label: 'Sắp xếp hàng hóa trên quầy', type: 'select', options: DAM_BAO, required: true },
      { key: 'atld_nv', label: 'Nhân viên CH tuân thủ quy định vệ sinh an toàn lao động', type: 'select', options: DAM_BAO, required: true },
      { key: 'atld_khac', label: 'Các nội dung ATLĐ khác', type: 'select', options: DAM_BAO, required: true },
      { key: 'atld_loi', label: 'Ghi rõ lỗi ATLĐ không đảm bảo', type: 'textarea', showIf: (f) => hasFault(f, ['atld_kho', 'atld_quay', 'atld_nv', 'atld_khac']) },
      { key: 'hinh_atld', label: 'Hình ảnh hạng mục ATLĐ không đảm bảo (tối đa 3 ảnh)', type: 'photos', max: 3, showIf: (f) => hasFault(f, ['atld_kho', 'atld_quay', 'atld_nv', 'atld_khac']) },
    ],
  },
  {
    title: 'Phòng cháy chữa cháy',
    fields: [
      { key: 'pccc_binh_bot', label: 'Bình PCCC bột', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'pccc_binh_khi', label: 'Bình PCCC khí', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'pccc_dien', label: 'Hệ thống điện, dây dẫn', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'pccc_exit', label: 'Đèn Exit, chiếu sáng sự cố', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'pccc_noi_quy', label: 'Biển, bảng nội quy tiêu lệnh PCCC dán nơi dễ thấy, không bị che chắn', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'pccc_khac', label: 'Nội dung an toàn PCCC khác', type: 'select', options: DAM_BAO_KHONG_CO, required: true },
      { key: 'pccc_loi', label: 'Ghi rõ lỗi PCCC không đảm bảo', type: 'textarea', showIf: (f) => hasFault(f, ['pccc_binh_bot', 'pccc_binh_khi', 'pccc_dien', 'pccc_exit', 'pccc_noi_quy', 'pccc_khac']) },
      { key: 'hinh_pccc', label: 'Hình ảnh hạng mục PCCC không đảm bảo (tối đa 3 ảnh)', type: 'photos', max: 3, showIf: (f) => hasFault(f, ['pccc_binh_bot', 'pccc_binh_khi', 'pccc_dien', 'pccc_exit', 'pccc_noi_quy', 'pccc_khac']) },
      { key: 'sl_binh_bot', label: 'Số lượng bình PCCC bột', type: 'int', required: true },
      { key: 'sl_binh_khi', label: 'Số lượng bình PCCC khí', type: 'int', required: true },
    ],
  },
  {
    title: 'Camera',
    fields: [
      { key: 'sl_camera', label: 'Số lượng camera', type: 'int', required: true },
      { key: 'sl_dau_ghi', label: 'Số lượng đầu ghi', type: 'int', required: true },
      { key: 'dau_ghi_hang', label: 'Hãng đầu ghi', type: 'select', options: ['Vantech', 'Hikvision', 'Khác'], required: true },
      { key: 'dau_ghi_hang_khac', label: 'Tên hãng khác', type: 'text', showIf: (f) => f.dau_ghi_hang === 'Khác' },
      { key: 'dau_ghi_cong', label: 'Chủng loại đầu ghi', type: 'select', options: ['4 cổng', '8 cổng', '16 cổng', '32 cổng', '64 cổng'], required: true },
      { key: 'camera_he_thong', label: 'Hệ thống camera đang sử dụng', type: 'select', options: ['IP', 'Analog'], required: true },
      { key: 'camera_so_ngay_luu', label: 'Số ngày camera đang lưu trữ', type: 'int', required: true },
      { key: 'camera_danh_gia', label: 'Đánh giá hệ thống camera', type: 'select', options: ['Đảm bảo quan sát tốt, hình ảnh sắc nét, số ngày lưu trữ dữ liệu theo quy định', 'Không đảm bảo'], required: true,
        hint: 'Nếu không đảm bảo: lập biên bản, hướng dẫn CH báo SAP để TT Camera tiếp nhận xử lý' },
      { key: 'camera_loi', label: 'Ghi rõ lỗi camera không đảm bảo', type: 'textarea', showIf: (f) => f.camera_danh_gia === 'Không đảm bảo' },
    ],
  },
  {
    title: 'Nhân viên cửa hàng',
    fields: [
      { key: 'nv_tu_van', label: 'Nhiệt tình tư vấn, giải đáp thắc mắc và hỗ trợ khách hàng', type: 'select', options: DAM_BAO, required: true },
      { key: 'nv_ky_luat', label: 'Không tụ tập, nói chuyện, làm việc riêng trong giờ', type: 'select', options: DAM_BAO, required: true },
      { key: 'nv_khoa_xe', label: 'Khóa xe của bản thân và nhắc nhở khách hàng khóa xe đầy đủ', type: 'select', options: DAM_BAO, required: true },
      { key: 'nv_giao_tiep', label: 'Giao tiếp: chủ động cười, chào, cảm ơn khách', type: 'select', options: DAM_BAO, required: true },
      { key: 'nv_dien_mao', label: 'Diện mạo, đồng phục, biển tên theo quy định', type: 'select', options: DAM_BAO, required: true },
      { key: 'nv_vi_pham', label: 'Họ tên nhân viên và lỗi vi phạm cụ thể', type: 'textarea', showIf: (f) => hasFault(f, ['nv_tu_van', 'nv_ky_luat', 'nv_khoa_xe', 'nv_giao_tiep', 'nv_dien_mao']) },
    ],
  },
  {
    title: 'Bảo vệ',
    fields: [
      { key: 'co_bao_ve', label: 'Cửa hàng có bố trí bảo vệ không', type: 'select', options: ['Có', 'Không'], required: true },
      ...[
        ['bv_vi_tri', 'Luôn có mặt tại vị trí theo phương án'],
        ['bv_kiem_soat', 'Chủ động kiểm soát người và phương tiện ra vào'],
        ['bv_dong_phuc', 'Đồng phục đúng quy định, quần áo sạch sẽ, giày đánh sạch'],
        ['bv_tu_the', 'Tư thế đứng, ngồi kiểm soát đúng quy định'],
        ['bv_dien_mao', 'Diện mạo gọn gàng, sạch sẽ'],
        ['bv_giao_tiep', 'Giao tiếp với khách hàng (chủ động, cười, chào, cảm ơn)'],
        ['bv_ho_tro', 'Hỗ trợ khách hàng (bê đồ, dắt xe, mở cửa xe, cửa kính...)'],
        ['bv_xe', 'Hướng dẫn, sắp xếp xe ngay ngắn, giúp đỡ khách khi ra vào'],
        ['bv_ky_luat', 'Không tụ tập, nói chuyện, làm việc riêng trong giờ'],
      ].map(([key, label]) => ({ key, label, type: 'select', options: DAT, required: true, showIf: (f) => f.co_bao_ve === 'Có' })),
      { key: 'hinh_bao_ve', label: 'Hình ảnh bảo vệ không đạt (tối đa 3 ảnh)', type: 'photos', max: 3,
        showIf: (f) => f.co_bao_ve === 'Có' && hasFault(f, ['bv_vi_tri', 'bv_kiem_soat', 'bv_dong_phuc', 'bv_tu_the', 'bv_dien_mao', 'bv_giao_tiep', 'bv_ho_tro', 'bv_xe', 'bv_ky_luat']) },
      { key: 'bv_vi_pham', label: 'Họ tên nhân viên bảo vệ không tuân thủ', type: 'text',
        showIf: (f) => f.co_bao_ve === 'Có' && hasFault(f, ['bv_vi_tri', 'bv_kiem_soat', 'bv_dong_phuc', 'bv_tu_the', 'bv_dien_mao', 'bv_giao_tiep', 'bv_ho_tro', 'bv_xe', 'bv_ky_luat']) },
    ],
  },
];

export const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

// Các cột nhập tay ở phần đầu form (ngoài SECTIONS)
export const HEADER_COLUMNS = ['sap', 'store_name', 'cvan_user', 'cvan_name', 'inspector_title', 'area_cvan'];
