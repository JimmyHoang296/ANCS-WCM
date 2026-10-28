import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, FileText, Plus } from "lucide-react";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import ViolationDetailModal from "./ViolationDetailModal";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const todayStr       = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const thisMonthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const prevMonth      = () => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last  = new Date(d.getFullYear(), d.getMonth(), 0);
  const fmt = (x) => x.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  return { start: fmt(first), end: fmt(last) };
};
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); };

const TRANG_THAI_OPTIONS = ['Đang làm rõ', 'Đã hoàn thành'];

const filterFn = (item, q) =>
  (!q.sap        || item.sap?.toLowerCase().includes(q.sap.toLowerCase()))    &&
  (!q.store      || item.store?.toLowerCase().includes(q.store.toLowerCase())) &&
  (!q.kstt       || item.kstt?.toLowerCase().includes(q.kstt.toLowerCase()))   &&
  (!q.trangThai  || item.trang_thai === q.trangThai)                           &&
  (!q.dateFrom   || (item.ngayKiemTra || '') >= q.dateFrom)                    &&
  (!q.dateTo     || (item.ngayKiemTra || '') <= q.dateTo);

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 inline ml-1" />
    : <ChevronDown className="w-3 h-3 inline ml-1" />;
};

const ViolationManager = () => {
  const data     = useStore((state) => state.data);
  const setData  = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);
  const refreshKey = useStore((state) => state.refreshKey);

  const { role, name: userName } = data.user || {};
  const defaultKstt = role === 'emp' ? (userName || '') : '';

  const {
    items: inspections, setItems: setInspections,
    searchQuery, setSearchQuery, filteredItems,
    currentPage, setCurrentPage,
    isModalOpen, selectedItem: selectedInspection,
    loading, setLoading,
    handleSearchChange, resetSearch,
    openModal, closeModal,
  } = useManagerPage({
    initialItems: data.inspections || [],
    initialSearch: { sap: '', store: '', kstt: defaultKstt, trangThai: '', dateFrom: thisMonthStart(), dateTo: todayStr() },
    filterFn,
    refreshKey,
  });

  const setDateRange = (from, to) => {
    setSearchQuery((q) => ({ ...q, dateFrom: from, dateTo: to }));
    setCurrentPage(1);
  };

  const quickBtns = [
    { label: 'Tháng này',   action: () => setDateRange(thisMonthStart(), todayStr()) },
    { label: 'Tháng trước', action: () => { const pm = prevMonth(); setDateRange(pm.start, pm.end); } },
    { label: '30 ngày',     action: () => setDateRange(daysAgo(30), todayStr()) },
    { label: 'Tất cả',      action: () => setDateRange('', '') },
  ];

  const [sortField, setSortField] = useState('ngayKiemTra');
  const [sortDir,   setSortDir]   = useState('desc');
  const PER_PAGE = 20;

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const sortedPaginatedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const vA = a[sortField] ?? '', vB = b[sortField] ?? '';
      const cmp = typeof vA === 'number' ? vA - vB : String(vA).localeCompare(String(vB), 'vi');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    const start = (currentPage - 1) * PER_PAGE;
    return sorted.slice(start, start + PER_PAGE);
  }, [filteredItems, sortField, sortDir, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / PER_PAGE);

  const TRANG_THAI_BADGE = {
    'Đang làm rõ':  'bg-purple-100 text-purple-700',
    'Đã hoàn thành':'bg-green-100 text-green-700',
  };

  const COLS = [
    { label: 'Mã',        field: 'id'          },
    { label: 'Mã CH',     field: 'sap'         },
    { label: 'Tên CH',    field: 'store'       },
    { label: 'Ngày KT',   field: 'ngayKiemTra' },
    { label: 'KSTT',      field: 'kstt'        },
    { label: 'Trạng thái',field: 'trang_thai'  },
  ];

  useEffect(() => { setData((prev) => ({ ...prev, inspections })); }, [inspections]);

  // ViolationDetailModal handles its own API calls; these callbacks just update the list
  const handleCreated = (inspection) => setInspections((p) => [...p, inspection]);
  const handleUpdated = (inspection) => setInspections((p) => p.map((v) => v.id === inspection.id ? inspection : v));
  const handleDeleted = (id) => setInspections((p) => p.filter((v) => v.id !== id));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Tổng hợp ghi nhận</h2>
        <button
          onClick={() => openModal({ sap: '', store: '', qlkv: '', gdv: '', chain: '' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Ghi nhận mới
        </button>
      </div>

      {/* Date filter */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
            <input type="date" name="dateFrom" value={searchQuery.dateFrom} onChange={handleSearchChange} className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
            <input type="date" name="dateTo" value={searchQuery.dateTo} onChange={handleSearchChange} className={INPUT} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {quickBtns.map(({ label, action }) => (
              <button key={label} onClick={action} className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-white bg-white transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Mã CH</label>
            <input name="sap" value={searchQuery.sap} onChange={handleSearchChange} placeholder="Tìm theo mã CH..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tên CH</label>
            <input name="store" value={searchQuery.store} onChange={handleSearchChange} placeholder="Tìm theo tên CH..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">KSTT</label>
            <input name="kstt" value={searchQuery.kstt} onChange={handleSearchChange} placeholder="Tìm theo KSTT..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
            <select name="trangThai" value={searchQuery.trangThai} onChange={handleSearchChange} className={`${INPUT} bg-white`}>
              <option value="">Tất cả</option>
              {TRANG_THAI_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={resetSearch} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Xoá lọc
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="px-6 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          Hiển thị <span className="font-medium text-gray-600">{sortedPaginatedItems.length}</span> / <span className="font-medium text-gray-600">{filteredItems.length}</span> ghi nhận
        </p>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Không có ghi nhận nào</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  {COLS.map(({ label, field }) => (
                    <th key={field} onClick={() => handleSort(field)} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      {label} <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPaginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{item.sap}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.store}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.ngayKiemTra}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.kstt}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRANG_THAI_BADGE[item.trang_thai] || 'bg-purple-100 text-purple-700'}`}>
                        {item.trang_thai || 'Đang làm rõ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openModal(item)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="block md:hidden divide-y divide-gray-100">
            {sortedPaginatedItems.map((item) => (
              <div key={item.id} className="px-4 py-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.sap} — {item.store}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.ngayKiemTra} · {item.kstt}</p>
                  </div>
                  <button onClick={() => openModal(item)} className="shrink-0 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-mono">{item.id}</p>
              </div>
            ))}
          </div>

          <div className="px-6 pb-4">
            <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
        </>
      )}

      {isModalOpen && (
        <ViolationDetailModal
          data={data}
          inspection={selectedInspection}
          onClose={closeModal}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
      {loading && <LoadingModal message="Đang xử lý..." />}
    </div>
  );
};

export default ViolationManager;
