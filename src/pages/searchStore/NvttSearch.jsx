import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, MessageCircle, Phone, Search, User, Users, X } from 'lucide-react';
import { nvttApi } from '../../api/nvtt';
import LoadingModal from '../../components/LoadingModal';

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const MAX_SHOWN = 50;

// Bỏ dấu + chữ thường để gõ "nguyen van a" vẫn tìm ra "Nguyễn Văn A"
const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const digits = (s) => String(s || '').replace(/\D/g, '');

const Row = ({ label, children }) =>
  children ? (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 shrink-0 w-24 text-xs pt-0.5">{label}</span>
      <span className="text-gray-700 min-w-0 break-words">{children}</span>
    </div>
  ) : null;

function PhoneButtons({ phone }) {
  const d = digits(phone);
  if (d.length < 8) return null;
  return (
    <span className="inline-flex gap-1.5 ml-2 align-middle">
      <a href={`tel:${d}`} className="inline-flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100">
        <Phone className="w-3 h-3" /> Gọi
      </a>
      <a href={`viber://chat?number=%2B84${d.replace(/^0/, '')}`} className="inline-flex items-center gap-1 px-3 py-2 sm:px-2 sm:py-1 text-xs bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100">
        <MessageCircle className="w-3 h-3" /> Viber
      </a>
    </span>
  );
}

function NvttCard({ r }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <User className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-gray-800 leading-snug">{r.ho_ten}</p>
        </div>
        {r.ancs_quan_ly && (
          <span className="shrink-0 text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">
            ANCS: {r.ancs_quan_ly}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <Row label="Người bảo lãnh">{r.bl_ten}</Row>
        <Row label="Quan hệ">{r.bl_quan_he}</Row>
        {r.bl_sdt && <Row label="SĐT bảo lãnh"><span>{r.bl_sdt}</span><PhoneButtons phone={r.bl_sdt} /></Row>}
        {r.bl_dia_chi && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500 pt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{r.bl_dia_chi}</span>
          </div>
        )}
      </div>

      {(r.bl_chuc_danh || r.bl_cmnd || r.trich_ngang) && (
        <>
          <button onClick={() => setOpen((p) => !p)} className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 font-medium py-1">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Chi tiết
          </button>
          {open && (
            <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
              <Row label="Chức danh / SĐT">{r.bl_chuc_danh}</Row>
              <Row label="Cấp bậc / CMND">{r.bl_cmnd}</Row>
              {r.trich_ngang && <p className="text-xs text-gray-600 whitespace-pre-line pt-1">{r.trich_ngang}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const NvttSearch = () => {
  const [all, setAll] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    nvttApi.list().then((r) => (r.success ? setAll(r.data) : setError(r.message)));
  }, []);

  const results = useMemo(() => {
    if (!all) return [];
    const nq = norm(q).trim();
    const dq = digits(q);
    if (!nq) return [];
    return all.filter((r) =>
      norm(`${r.ho_ten} ${r.bl_ten} ${r.ancs_quan_ly}`).includes(nq) ||
      (dq.length >= 4 && digits(`${r.bl_sdt} ${r.bl_chuc_danh} ${r.bl_cmnd}`).includes(dq))
    );
  }, [all, q]);

  const shown = results.slice(0, MAX_SHOWN);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Tìm kiếm nhân viên thu tiền</h2>
        {all && <p className="text-xs text-gray-400 mt-0.5">{all.length} nhân viên trong danh sách</p>}
      </div>

      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên nhân viên, người bảo lãnh, SĐT, CVAN quản lý..."
            className={`${INPUT} pl-9 pr-9`} autoComplete="off" />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-500">Không tải được danh sách: {error}</p>}
      </div>

      <div className="px-4 sm:px-6 py-5">
        {all && all.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Chưa có danh sách. Trưởng phòng cần upload file ở trang Quản trị.</p>
          </div>
        ) : !q.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <Search className="w-10 h-10 mb-3" />
            <p className="text-sm">Nhập thông tin để tìm kiếm</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Không tìm thấy nhân viên nào</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">
              Tìm thấy <span className="font-medium text-gray-600">{results.length}</span> nhân viên
              {results.length > MAX_SHOWN && ` (hiển thị ${MAX_SHOWN} đầu tiên, hãy gõ cụ thể hơn)`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shown.map((r, i) => <NvttCard key={`${r.ho_ten}-${i}`} r={r} />)}
            </div>
          </>
        )}
      </div>

      {!all && !error && <LoadingModal message="Đang tải danh sách..." />}
    </div>
  );
};

export default NvttSearch;
