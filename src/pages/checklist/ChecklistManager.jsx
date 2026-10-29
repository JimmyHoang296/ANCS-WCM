import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Eye, Image, Plus } from "lucide-react";
import { checklistApi } from "../../api/checklist";
import useStore from "../../store/useStore";
import Pagination from "../../components/Pagination";
import LoadingModal from "../../components/LoadingModal";
import ChecklistFormModal from "./ChecklistFormModal";
import { ALL_FIELDS } from "./checklistSchema";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const PER_PAGE = 20;
const BAD = ["Không đạt", "Không đảm bảo"];

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const monthStart = () => today().slice(0, 8) + "01";

const countFaults = (r) => ALL_FIELDS.filter((f) => f.type === "select" && BAD.includes(r[f.key])).length;
const countPhotos = (r) => ALL_FIELDS.reduce((n, f) => n + (f.type === "photos" ? (r[f.key]?.length || 0) : 0), 0);

const ChecklistManager = () => {
  const user = useStore((s) => s.data.user);
  const emps = useStore((s) => s.data.emps);
  const addToast = useStore((s) => s.addToast);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState({ dateFrom: monthStart(), dateTo: today() });
  const [search, setSearch] = useState({ sap: "", cvan: "" });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({ open: false, record: null });

  // Trưởng phòng xem tất cả; trưởng bộ phận xem mình + chuyên viên dưới quyền; chuyên viên chỉ xem của mình.
  const names = useMemo(() => {
    if (user.title === "truong_phong") return null;
    if (user.title === "truong_bo_phan") return [...new Set([user.name, ...emps])];
    return [user.name];
  }, [user, emps]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await checklistApi.list({ names, ...range });
    setLoading(false);
    if (r.success) { setItems(r.data); setPage(1); }
    else addToast("Không tải được checklist: " + r.message, "error");
  }, [names, range, addToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items.filter((r) =>
    (!search.sap || `${r.sap} ${r.store_name || ""}`.toLowerCase().includes(search.sap.toLowerCase())) &&
    (!search.cvan || (r.cvan_name || "").toLowerCase().includes(search.cvan.toLowerCase()))
  ), [items, search]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const fmt = (iso) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });

  const handleSaved = (row, isNew) =>
    setItems((p) => (isNew ? [row, ...p] : p.map((x) => (x.id === row.id ? row : x))));
  const handleDeleted = (id) => setItems((p) => p.filter((x) => x.id !== id));

  const setRangeField = (e) => setRange((r) => ({ ...r, [e.target.name]: e.target.value }));
  const setSearchField = (e) => { setSearch((s) => ({ ...s, [e.target.name]: e.target.value })); setPage(1); };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Checklist ANAT & PCCC</h2>
        <button onClick={() => setModal({ open: true, record: null })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Checklist mới
        </button>
      </div>

      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
          <input type="date" name="dateFrom" value={range.dateFrom} onChange={setRangeField} className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
          <input type="date" name="dateTo" value={range.dateTo} onChange={setRangeField} className={INPUT} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Mã / tên CH</label>
          <input name="sap" value={search.sap} onChange={setSearchField} placeholder="Tìm cửa hàng..." className={`${INPUT} w-full`} />
        </div>
        {user.title !== "chuyen_vien" && (
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Người kiểm tra</label>
            <input name="cvan" value={search.cvan} onChange={setSearchField} placeholder="Tìm CVAN..." className={`${INPUT} w-full`} />
          </div>
        )}
      </div>

      <div className="px-6 pt-3 pb-1">
        <p className="text-xs text-gray-400">
          Hiển thị <span className="font-medium text-gray-600">{paged.length}</span> / <span className="font-medium text-gray-600">{filtered.length}</span> checklist
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ClipboardCheck className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Không có checklist nào</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-y border-gray-100">
                <tr>
                  {["Thời gian", "Mã CH", "Tên CH", "Người kiểm tra", "Mục không đạt", "Ảnh", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((r) => {
                  const faults = countFaults(r), photos = countPhotos(r);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{r.sap}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.store_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{r.cvan_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${faults ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {faults ? `${faults} mục` : "Đạt"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {photos > 0 && <span className="inline-flex items-center gap-1"><Image size={14} />{photos}</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setModal({ open: true, record: r })} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4">
            <Pagination totalPages={Math.ceil(filtered.length / PER_PAGE)} currentPage={page} setCurrentPage={setPage} />
          </div>
        </>
      )}

      {modal.open && (
        <ChecklistFormModal record={modal.record} onClose={() => setModal({ open: false, record: null })}
          onSaved={handleSaved} onDeleted={handleDeleted} />
      )}
      {loading && <LoadingModal message="Đang tải..." />}
    </div>
  );
};

export default ChecklistManager;
