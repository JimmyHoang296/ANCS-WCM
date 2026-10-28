import React, { useState } from 'react';
import { Search, MapPin, Phone, Store, MessageCircle, History, X, ChevronDown, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
import LoadingModal from '../../components/LoadingModal';
import { api } from '../../api';

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const TRANG_THAI_INSPECTION = {
  'Đang làm rõ': 'bg-purple-100 text-purple-700',
  'Đã hoàn thành': 'bg-green-100 text-green-700',
};
const TRANG_THAI_VIOLATION = {
  'Vi phạm':             'bg-red-100 text-red-700',
  'Nhắc nhở':            'bg-orange-100 text-orange-700',
  'Xác minh thêm':       'bg-yellow-100 text-yellow-700',
  'Ghi nhận thực trạng': 'bg-gray-100 text-gray-600',
};

const InfoRow = ({ label, value }) =>
  value ? (
    <div className="flex items-start gap-1.5 text-sm">
      <span className="text-gray-400 shrink-0 w-14 text-xs pt-0.5">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  ) : null;

function InspectionHistoryRow({ insp }) {
  const [open, setOpen] = useState(false);
  const vios = insp.violations || [];

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => vios.length > 0 && setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {vios.length > 0
          ? open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />
          : <span className="w-3.5 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800">{insp.ngayKiemTra}</span>
            <span className="text-xs text-gray-500">· {insp.kstt}</span>
            {vios.length > 0 && (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{vios.length} vi phạm</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRANG_THAI_INSPECTION[insp.trang_thai] || 'bg-purple-100 text-purple-700'}`}>
              {insp.trang_thai || 'Đang làm rõ'}
            </span>
          </div>
          {insp.thuTin && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{insp.thuTin}</p>
          )}
        </div>
        <span className="text-xs font-mono text-gray-300 shrink-0">{insp.id}</span>
      </button>

      {open && vios.length > 0 && (
        <div className="divide-y divide-gray-50">
          {vios.map((v) => (
            <div key={v.id} className="px-5 py-2.5 bg-white">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-medium text-gray-700">{v.nhom}</span>
                    {v.trang_thai && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${TRANG_THAI_VIOLATION[v.trang_thai] || 'bg-gray-100 text-gray-600'}`}>
                        {v.trang_thai}
                      </span>
                    )}
                  </div>
                  {v.hanh_vi?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(Array.isArray(v.hanh_vi) ? v.hanh_vi : []).map((h, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{h}</span>
                      ))}
                    </div>
                  )}
                  {v.mo_ta && <p className="text-xs text-gray-500">{v.mo_ta}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {v.ten_nv && <span className="text-xs text-gray-400">{v.ma_nv} {v.ten_nv} {v.chuc_danh && `· ${v.chuc_danh}`}</span>}
                    {v.ket_luan && <span className="text-xs text-gray-400">KL: {v.ket_luan}</span>}
                    {v.xlvp && <span className="text-xs text-gray-400">XLVP: {v.xlvp}</span>}
                    {v.gia_tri > 0 && <span className="text-xs font-medium text-red-600">{Number(v.gia_tri).toLocaleString('vi-VN')} đ</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const XLVP_BADGE = {
  'Đã trình':   'bg-green-100 text-green-700',
  'Chờ trình':  'bg-yellow-100 text-yellow-700',
  'Đang xử lý': 'bg-blue-100 text-blue-700',
};

function XlvpSection({ nhom1, nhomKhac }) {
  const total = nhom1.length + nhomKhac.length;
  if (total === 0) return (
    <div className="text-center py-8 text-gray-400 text-sm">Chưa có XLVP nào</div>
  );

  return (
    <div className="space-y-3">
      {nhom1.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nhóm 1 ({nhom1.length})</p>
          <div className="space-y-2">
            {nhom1.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-lg px-4 py-3 bg-white">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-700">Tuần {r.week}</span>
                    <span className="text-xs text-gray-400">· {r.kstt_submitted}</span>
                    {r.Note && <span className={`text-xs px-1.5 py-0.5 rounded-full ${XLVP_BADGE[r.Note] || 'bg-gray-100 text-gray-600'}`}>{r.Note}</span>}
                  </div>
                  {(r.loss_value > 0) && (
                    <span className="text-xs font-semibold text-red-600 shrink-0">{Number(r.loss_value).toLocaleString('vi-VN')} đ</span>
                  )}
                </div>
                <p className="text-xs text-gray-800 font-medium">{r.emp_name} {r.emp_title && `· ${r.emp_title}`}</p>
                {r.violation_text && <p className="text-xs text-gray-500 mt-0.5">{r.violation_text}</p>}
                {r.recover_value > 0 && <p className="text-xs text-green-600 mt-0.5">Thu hồi: {Number(r.recover_value).toLocaleString('vi-VN')} đ</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {nhomKhac.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nhóm khác ({nhomKhac.length})</p>
          <div className="space-y-2">
            {nhomKhac.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-lg px-4 py-3 bg-white">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-700">Tuần {r.week}</span>
                    <span className="text-xs text-gray-400">· {r.kstt_submitted}</span>
                    {r.status && <span className={`text-xs px-1.5 py-0.5 rounded-full ${XLVP_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>{r.status}</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-800 font-medium">{r.emp_name} {r.emp_title && `· ${r.emp_title}`}</p>
                {r.violation_text && <p className="text-xs text-gray-500 mt-0.5">{r.violation_text}</p>}
                {r.disciplinary_action && <p className="text-xs text-indigo-600 mt-0.5">XLVP: {r.disciplinary_action}</p>}
                {r.NOTE && <p className="text-xs text-gray-400 mt-0.5">{r.NOTE}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryModal({ shop, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('gn');

  React.useEffect(() => {
    api.getStoreHistory(shop.site).then((r) => {
      console.log('[StoreHistory]', shop.site, r);
      if (r.success) setData(r.data);
      else setError(r.message || 'Lỗi tải dữ liệu');
      setLoading(false);
    });
  }, [shop.site]);

  const inspections = data?.inspections || [];
  const nhom1 = data?.nhom1 || [];
  const nhomKhac = data?.nhomKhac || [];
  const totalVio = inspections.reduce((s, i) => s + (i.violations?.length || 0), 0);
  const totalXlvp = nhom1.length + nhomKhac.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <History size={18} className="text-indigo-500" />
          <div>
            <h3 className="text-base font-bold text-gray-900">{shop.siteName}</h3>
            <p className="text-xs text-gray-400">{shop.site} · Lịch sử ghi nhận & XLVP</p>
          </div>
          {data && (
            <div className="flex gap-2">
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{inspections.length} lượt GN</span>
              {totalVio > 0 && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">{totalVio} vi phạm</span>}
              {totalXlvp > 0 && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">{totalXlvp} XLVP</span>}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      {!loading && !error && (
        <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
          <button
            onClick={() => setTab('gn')}
            className={`px-4 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === 'gn' ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Ghi nhận {inspections.length > 0 && `(${inspections.length})`}
          </button>
          <button
            onClick={() => setTab('xlvp')}
            className={`px-4 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === 'xlvp' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            XLVP {totalXlvp > 0 && `(${totalXlvp})`}
          </button>
        </div>
      )}
      <div className="border-b border-gray-100 shrink-0" />

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Đang tải...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 text-sm">{error}</div>
        ) : tab === 'gn' ? (
          inspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileText size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Chưa có ghi nhận nào tại cửa hàng này</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inspections.map((insp) => (
                <InspectionHistoryRow key={insp.id} insp={insp} />
              ))}
            </div>
          )
        ) : (
          <XlvpSection nhom1={nhom1} nhomKhac={nhomKhac} />
        )}
      </div>
    </div>
  );
}

const SearchStore = () => {
  const [site,     setSite]     = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAdd,  setSiteAdd]  = useState('');
  const [results,  setResults]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [historyShop, setHistoryShop] = useState(null);

  const handleSearch = async () => {
    if (!site && !siteName && !siteAdd) { setError('Nhập ít nhất một thông tin tìm kiếm'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.searchStore({ site, siteName, siteAdd });
      setResults(data.result || []);
      setSearched(true);
    } catch {
      setError('Có lỗi xảy ra, hãy thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Tìm kiếm cửa hàng</h2>
      </div>

      {/* Search inputs */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
            <input value={site} onChange={(e) => setSite(e.target.value)} onKeyDown={handleKeyDown} placeholder="Mã site..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tên CH</label>
            <input value={siteName} onChange={(e) => setSiteName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Tên cửa hàng..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Địa chỉ</label>
            <input value={siteAdd} onChange={(e) => setSiteAdd(e.target.value)} onKeyDown={handleKeyDown} placeholder="Địa chỉ..." className={INPUT} />
          </div>
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Search className="w-4 h-4" /> Tìm kiếm
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      {/* Results */}
      <div className="px-6 py-5">
        {searched && (
          <p className="text-xs text-gray-400 mb-4">
            Tìm thấy <span className="font-medium text-gray-600">{results.length}</span> cửa hàng
          </p>
        )}

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((shop, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2">
                    <Store className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{shop.siteName}</p>
                        {shop.chuoi === 'Winmart' && (
                          <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">Siêu thị</span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-600 font-medium">{shop.site}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setHistoryShop(shop)}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors font-medium"
                    title="Xem lịch sử ghi nhận & vi phạm"
                  >
                    <History size={12} /> Lịch sử
                  </button>
                </div>

                {shop.address && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{shop.address}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <InfoRow label="CHT" value={shop.CHT} />
                  {shop.CHTPhone && (
                    <div className="flex items-start gap-1.5">
                      <span className="text-gray-400 shrink-0 w-14 text-xs pt-1.5">SĐT</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-600">{shop.CHTPhone}</span>
                        <div className="flex gap-1.5">
                          <a
                            href={`tel:${shop.CHTPhone}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                          >
                            <Phone className="w-3 h-3" /> Gọi
                          </a>
                          <a
                            href={`viber://chat?number=%2B84${String(shop.CHTPhone).replace(/^0/, '')}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" /> Viber
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  <InfoRow label="QLKV" value={shop.QLKV} />
                  <InfoRow label="GĐV"  value={shop.GDV}  />
                  <InfoRow label="KSTT" value={shop.KSTT} />
                  <InfoRow label="TBP An ninh" value={shop.tbpAnNinh} />
                  <InfoRow label="CV An ninh"  value={shop.cvAnNinh}  />
                </div>

                {shop.lat && shop.long && (
                  <a
                    href={`https://maps.google.com/?q=${shop.lat},${shop.long}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Xem bản đồ
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : searched && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Store className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Không tìm thấy cửa hàng nào</p>
          </div>
        ) : !searched ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <Search className="w-10 h-10 mb-3" />
            <p className="text-sm">Nhập thông tin để tìm kiếm</p>
          </div>
        ) : null}
      </div>

      {loading && <LoadingModal message="Đang tìm kiếm..." />}

      {historyShop && (
        <HistoryModal shop={historyShop} onClose={() => setHistoryShop(null)} />
      )}
    </div>
  );
};

export default SearchStore;
