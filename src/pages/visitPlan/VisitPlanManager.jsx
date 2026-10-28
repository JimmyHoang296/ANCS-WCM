import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye, Plus, CalendarDays } from "lucide-react";
import { getTodayDateString, toDateInputValue } from "../../assets/helpers";
import { api } from "../../api";
import { useManagerPage } from "../../hooks/useManagerPage";
import useStore from "../../store/useStore";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import VisitPlanDetailModal from "./VisitPlanDetailModal";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const StatusBadge = ({ status }) => {
  const map = {
    pending:   'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100  text-green-800',
    cancelled: 'bg-gray-100   text-gray-600',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status || '—'}
    </span>
  );
};

const planFilterFn = (p, q) =>
  (!q.site   || p.site?.toLowerCase().includes(q.site.toLowerCase()))   &&
  (!q.status || p.status?.toLowerCase().includes(q.status.toLowerCase()));

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 inline ml-1" />
    : <ChevronDown className="w-3 h-3 inline ml-1" />;
};

const VisitPlanManager = () => {
  const data     = useStore((state) => state.data);
  const setData  = useStore((state) => state.setData);
  const addToast = useStore((state) => state.addToast);
  const refreshKey = useStore((state) => state.refreshKey);

  const {
    items: plans, setItems: setPlans,
    searchQuery, filteredItems,
    currentPage, setCurrentPage,
    isModalOpen, selectedItem: selectedPlan,
    loading, setLoading,
    handleSearchChange, resetSearch,
    openModal, closeModal,
  } = useManagerPage({
    initialItems: data.visitPlan || [],
    initialSearch: { site: '', status: '' },
    filterFn: planFilterFn,
    refreshKey,
  });

  const [sortField, setSortField] = useState('date');
  const [sortDir,   setSortDir]   = useState('desc');
  const PER_PAGE = 20;

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const paginatedPlans = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const vA = a[sortField] ?? '', vB = b[sortField] ?? '';
      const cmp = typeof vA === 'number' ? vA - vB : String(vA).localeCompare(String(vB), 'vi');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    const start = (currentPage - 1) * PER_PAGE;
    return sorted.slice(start, start + PER_PAGE);
  }, [filteredItems, sortField, sortDir, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / PER_PAGE);

  const COLS = [
    { label: 'Ngày',      field: 'date'   },
    { label: 'Site',      field: 'site'   },
    { label: 'Path',      field: 'path'   },
    { label: 'Trạng thái',field: 'status' },
  ];

  useEffect(() => { setData((prev) => ({ ...prev, visitPlan: plans })); }, [plans]);

  async function handleSaveNew(plan) {
    const sites = [...new Set(String(plan.site || '').split(',').map((s) => s.trim()).filter(Boolean))];
    if (sites.length === 0) { addToast('Vui lòng nhập mã CH', 'error'); return; }

    try {
      setLoading(true);
      if (sites.length === 1) {
        const newPlan = { ...plan, site: sites[0], user: data.user.id };
        const r = await api.createVisitPlan(newPlan);
        if (r.success) { newPlan.id = r.data; setPlans((p) => [...p, newPlan]); closeModal(); addToast('Thêm kế hoạch thành công'); }
        else addToast('Thêm thất bại', 'error');
      } else {
        const r = await api.createVisitPlans({ ...plan, sites, user: data.user.id });
        if (r.success) { setPlans((p) => [...p, ...r.data]); closeModal(); addToast(`Đã thêm ${r.data.length} kế hoạch`); }
        else addToast('Thêm thất bại', 'error');
      }
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  async function handleUpdate(plan) {
    try {
      setLoading(true);
      const r = await api.updateVisitPlan(plan);
      if (r.success) { setPlans((p) => p.map((x) => (x.id === plan.id ? plan : x))); closeModal(); addToast('Cập nhật kế hoạch thành công'); }
      else addToast('Cập nhật thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  async function handleDelete(planId) {
    if (!confirm('Bạn muốn xóa kế hoạch này?')) return;
    try {
      setLoading(true);
      const r = await api.deleteVisitPlan(planId);
      if (r.success) { setPlans((p) => p.filter((x) => x.id !== planId)); closeModal(); addToast('Đã xóa kế hoạch'); }
      else addToast('Xóa thất bại', 'error');
    } catch { addToast('Lỗi kết nối, thử lại sau', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Đăng ký đổ dữ liệu</h2>
        <button
          onClick={() => openModal({ date: getTodayDateString(), site: '', path: '', status: 'pending' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Kế hoạch mới
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
            <input name="site" value={searchQuery.site} onChange={handleSearchChange} placeholder="Tìm theo site..." className={INPUT} />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
            <input name="status" value={searchQuery.status} onChange={handleSearchChange} placeholder="Tìm theo trạng thái..." className={INPUT} />
          </div>
          <button onClick={resetSearch} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            Xoá lọc
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="px-6 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          Hiển thị <span className="font-medium text-gray-600">{paginatedPlans.length}</span> / <span className="font-medium text-gray-600">{filteredItems.length}</span> kế hoạch
        </p>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <CalendarDays className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Không có kế hoạch nào</p>
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
                {paginatedPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{toDateInputValue(plan.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{plan.site}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{plan.path}</td>
                    <td className="px-4 py-3"><StatusBadge status={plan.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openModal(plan)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
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
            {paginatedPlans.map((plan) => (
              <div key={plan.id} className="px-4 py-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{plan.site}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.path}</p>
                  </div>
                  <button onClick={() => openModal(plan)} className="shrink-0 p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={plan.status} />
                  <span className="text-xs text-gray-400">{toDateInputValue(plan.date)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-4">
            <Pagination totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
        </>
      )}

      {isModalOpen && (
        <VisitPlanDetailModal
          plan={selectedPlan}
          onClose={closeModal}
          onSave={handleSaveNew}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
      {loading && <LoadingModal message="Đang xử lý..." />}
    </div>
  );
};

export default VisitPlanManager;
