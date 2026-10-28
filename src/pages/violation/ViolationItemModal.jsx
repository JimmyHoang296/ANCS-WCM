import React, { useState, useEffect } from 'react';
import { Save, X, ChevronDown } from 'lucide-react';
import { supabase } from '../../api/supabaseClient';

const KET_LUAN_OPTIONS = ['Xử lý', 'Gộp lỗi', 'Không xử lý'];
const TRANG_THAI_OPTIONS = ['Vi phạm', 'Nhắc nhở', 'Xác minh thêm', 'Ghi nhận thực trạng'];

const LABEL = 'block text-xs font-medium text-gray-600 mb-1';
const INPUT = 'w-full px-2 py-1.5 border rounded text-sm';
const SELECT = 'w-full px-2 py-1.5 border rounded text-sm bg-white';
const TEXTAREA = 'w-full px-3 py-2 border rounded text-sm leading-relaxed resize-y';
const SECTION = 'text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1 border-b mb-3';

const ViolationItemModal = ({ item, nhomGhiNhan, penalties, onClose, onSave }) => {
  const isNew = !item?.id;

  const [formData, setFormData] = useState(item || {
    nhom: '', hanh_vi: [], mo_ta: '', nguyen_nhan: '',
    trang_thai: 'Vi phạm', gia_tri: '',
    ma_nv: '', ten_nv: '', chuc_danh: '', ket_luan: '', nd_ket_luan: '',
    nhom_loi: '', loi_chi_tiet: '', xlvp: '',
  });

  const [hanhViOpen, setHanhViOpen] = useState(false);
  const [localNhom, setLocalNhom] = useState(nhomGhiNhan || []);
  const [nhomLoi, setNhomLoi] = useState([]);

  useEffect(() => {
    // Load nhomGhiNhan if missing
    if (!localNhom.length) {
      supabase.from('nhom_ghi_nhan').select('*').order('STT').then(({ data: rows }) => {
        if (rows) setLocalNhom(rows.map((r) => ({ nhom: r['Nhóm hành vi'], hanhVi: r['Hành vi'] })));
      });
    }
    // Load nhomLoi
    supabase.from('nhom_loi').select('id,violation,groupName').order('id').then(({ data: rows }) => {
      if (rows) setNhomLoi(rows);
    });
  }, []);

  // Nhóm hành vi
  const nhomList = [...new Map(localNhom.map((n) => [n.nhom, n.nhom])).keys()];
  const hanhViList = localNhom.filter((n) => n.nhom === formData.nhom).map((n) => n.hanhVi);
  const selectedCount = (formData.hanh_vi || []).length;

  // Nhóm lỗi: unique violation values
  const nhomLoiList = [...new Map(nhomLoi.map((r) => [r.violation, r.violation])).keys()];
  // Lỗi chi tiết: groupName filtered by selected nhom_loi
  const loiChiTietList = nhomLoi
    .filter((r) => r.violation === formData.nhom_loi)
    .map((r) => r.groupName);

  const set = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleNhomChange = (e) => {
    setFormData((p) => ({ ...p, nhom: e.target.value, hanh_vi: [] }));
    setHanhViOpen(false);
  };

  const handleNhomLoiChange = (e) => {
    setFormData((p) => ({ ...p, nhom_loi: e.target.value, loi_chi_tiet: '' }));
  };

  const toggleHanhVi = (hv) => {
    setFormData((p) => ({
      ...p,
      hanh_vi: (p.hanh_vi || []).includes(hv)
        ? (p.hanh_vi || []).filter((h) => h !== hv)
        : [...(p.hanh_vi || []), hv],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0 bg-gray-50 rounded-t-xl">
          <h4 className="text-sm font-bold text-gray-900">
            {isNew ? 'Thêm vi phạm' : 'Sửa vi phạm'}
          </h4>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="grid grid-cols-2 gap-y-3" style={{columnGap: 0}}>

            {/* ── CỘT TRÁI: Ghi nhận vi phạm ── */}
            <div className="space-y-2 pr-6 border-r border-gray-200">
              <p className={SECTION}>Ghi nhận vi phạm</p>

              {/* Nhóm hành vi */}
              <div>
                <label className={LABEL}>Nhóm hành vi</label>
                <select name="nhom" value={formData.nhom || ''} onChange={handleNhomChange} className={SELECT}>
                  <option value="">-- Chọn nhóm --</option>
                  {nhomList.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Hành vi multi-select */}
              {formData.nhom && (
                <div>
                  <label className={LABEL}>Hành vi</label>
                  <div className="border rounded overflow-hidden">
                    <button type="button" onClick={() => setHanhViOpen((p) => !p)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm text-left bg-white hover:bg-gray-50">
                      <span className={selectedCount === 0 ? 'text-gray-400' : 'text-gray-700'}>
                        {selectedCount === 0 ? 'Chọn hành vi...' : `Đã chọn ${selectedCount} hành vi`}
                      </span>
                      <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${hanhViOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {hanhViOpen && (
                      <div className="border-t max-h-32 overflow-y-auto">
                        {hanhViList.map((hv) => (
                          <label key={hv} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                            <input type="checkbox"
                              checked={(formData.hanh_vi || []).includes(hv)}
                              onChange={() => toggleHanhVi(hv)}
                              className="rounded text-indigo-600 shrink-0" />
                            {hv}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(formData.hanh_vi || []).map((hv) => (
                        <span key={hv} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                          {hv}
                          <button type="button" onClick={() => toggleHanhVi(hv)} className="hover:text-red-500 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Giá trị + Trạng thái */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={LABEL}>Giá trị (VNĐ)</label>
                  <input type="number" name="gia_tri" value={formData.gia_tri || ''} onChange={set} className={INPUT} min="0" />
                </div>
                <div>
                  <label className={LABEL}>Trạng thái</label>
                  <select name="trang_thai" value={formData.trang_thai || 'Vi phạm'} onChange={set} className={SELECT}>
                    {TRANG_THAI_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className={LABEL}>Mô tả vi phạm</label>
                <textarea name="mo_ta" value={formData.mo_ta || ''} onChange={set} rows={6}
                  className={TEXTAREA} placeholder="Mô tả chi tiết..." />
              </div>

              {/* Nguyên nhân */}
              <div>
                <label className={LABEL}>Nguyên nhân</label>
                <textarea name="nguyen_nhan" value={formData.nguyen_nhan || ''} onChange={set} rows={6}
                  className={TEXTAREA} placeholder="Nguyên nhân..." />
              </div>
            </div>

            {/* ── CỘT PHẢI: Xử lý vi phạm ── */}
            <div className="space-y-2 pl-6">
              <p className={SECTION}>Xử lý vi phạm</p>

              {/* Mã NV + Tên NV + Chức danh */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={LABEL}>Mã NV</label>
                  <input type="text" name="ma_nv" value={formData.ma_nv || ''} onChange={set} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Tên NV</label>
                  <input type="text" name="ten_nv" value={formData.ten_nv || ''} onChange={set} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Chức danh</label>
                  <input type="text" name="chuc_danh" value={formData.chuc_danh || ''} onChange={set} className={INPUT} />
                </div>
              </div>

              {/* Kết luận + Nhóm lỗi */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={LABEL}>Kết luận</label>
                  <select name="ket_luan" value={formData.ket_luan || ''} onChange={set} className={SELECT}>
                    <option value="">-- Chọn kết luận --</option>
                    {KET_LUAN_OPTIONS.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Nhóm lỗi</label>
                  <select name="nhom_loi" value={formData.nhom_loi || ''} onChange={handleNhomLoiChange} className={SELECT}>
                    <option value="">-- Chọn nhóm lỗi --</option>
                    {nhomLoiList.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {/* Lỗi chi tiết */}
              <div>
                <label className={LABEL}>Lỗi chi tiết</label>
                <select name="loi_chi_tiet" value={formData.loi_chi_tiet || ''} onChange={set}
                  disabled={!formData.nhom_loi}
                  className={`${SELECT} ${!formData.nhom_loi ? 'text-gray-400 bg-gray-50' : ''}`}>
                  <option value="">{formData.nhom_loi ? '-- Chọn lỗi chi tiết --' : '-- Chọn nhóm lỗi trước --'}</option>
                  {loiChiTietList.map((g, i) => <option key={i} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Hình thức XLVP */}
              <div>
                <label className={LABEL}>Hình thức XLVP</label>
                <select name="xlvp" value={formData.xlvp || ''} onChange={set} className={SELECT}>
                  <option value="">-- Chọn hình thức --</option>
                  {(penalties || []).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Nội dung kết luận */}
              <div>
                <label className={LABEL}>Nội dung kết luận</label>
                <textarea name="nd_ket_luan" value={formData.nd_ket_luan || ''} onChange={set} rows={6}
                  className={TEXTAREA} placeholder="Nội dung kết luận xử lý..." />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0 bg-gray-50 rounded-b-xl">
          <button onClick={onClose}
            className="px-4 py-1.5 text-xs border rounded text-gray-600 hover:bg-gray-100">
            Hủy
          </button>
          <button onClick={() => onSave(formData)}
            className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1.5">
            <Save size={12} /> Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViolationItemModal;
