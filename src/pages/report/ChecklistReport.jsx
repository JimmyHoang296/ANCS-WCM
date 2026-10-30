import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart2, ChevronDown, ChevronRight, Download, FileText, Search, X } from "lucide-react";
import { checklistApi } from "../../api/checklist";
import { listUsers } from "../../api/ancsUsers";
import { driveThumb } from "../../api/driveUpload";
import useStore from "../../store/useStore";
import LoadingModal from "../../components/LoadingModal";
import { SECTIONS } from "../checklist/checklistSchema";

// ─── Date helpers ─────────────────────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const fmtDate = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

const thisMonth = () => ({ start: todayStr().slice(0, 8) + "01", end: todayStr() });
const prevMonth = () => {
  const now = new Date();
  return {
    start: fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    end: fmtDate(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
};
const fmtTime = (iso) =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });

// ─── Phân tích 1 checklist ────────────────────────────────────────────────────
const BAD = ["Không đạt", "Không đảm bảo"];

const isFault = (f, v) =>
  f.type === "select" && v != null && v !== "" &&
  (BAD.includes(v) || (f.key === "bien_canh_bao" && v === "Không") ||
    (f.key.startsWith("vu_") && v !== "Không có"));

// [{section, label, value}] — các mục không đạt / có sự vụ
function faultsOf(r) {
  const out = [];
  SECTIONS.forEach((s) => s.fields.forEach((f) => {
    if (isFault(f, r[f.key])) out.push({ section: s.title, label: f.label, value: r[f.key] });
  }));
  return out;
}

// Ghi chú (textarea/text mô tả lỗi) và ảnh của 1 checklist
function notesOf(r) {
  const notes = [], photos = [];
  SECTIONS.forEach((s) => s.fields.forEach((f) => {
    const v = r[f.key];
    if (!v || (Array.isArray(v) && !v.length)) return;
    if (f.type === "photos") photos.push(...v);
    else if (f.type === "textarea" || f.key === "bv_vi_pham") notes.push({ label: f.label, value: v });
  }));
  return { notes, photos };
}

const SECTION_SHORT = {
  "Biển cảnh báo": "Biển CB",
  "Tình hình ANAT trong tháng": "Sự vụ ANAT",
  "Két sắt": "Két sắt",
  "Hệ thống cửa & khu vực": "Cửa & KV",
  "An toàn lao động": "ATLĐ",
  "Phòng cháy chữa cháy": "PCCC",
  "Camera": "Camera",
  "Nhân viên cửa hàng": "Nhân viên",
  "Bảo vệ": "Bảo vệ",
};

// ─── XLSX/CSV export (CSV + BOM để Excel đọc đúng tiếng Việt) ─────────────────
function downloadCsv(rows, start, end) {
  const head = ["Ngày KT", "Mã CH", "Tên CH", "CVAN", "Chức danh", "Nhóm", "Hạng mục", "Kết quả"];
  const lines = [head];
  rows.forEach((r) => {
    const base = [fmtTime(r.created_at), r.sap, r.store_name, r.cvan_name, r.inspector_title];
    const fl = r._faults;
    if (!fl.length) lines.push([...base, "", "", "Đạt"]);
    else fl.forEach((f) => lines.push([...base, f.section, f.label, f.value]));
  });
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + lines.map((l) => l.map(esc).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `TongHopChecklistANCS_${start}_${end}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Components ───────────────────────────────────────────────────────────────
const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function StatCard({ label, value, sub, tone }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${tone || "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionBreakdown({ rows }) {
  const counts = Object.fromEntries(SECTIONS.map((s) => [s.title, 0]));
  rows.forEach((r) => r._faults.forEach((f) => { counts[f.section]++; }));
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500 mb-2">Số mục không đạt theo hạng mục</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
        {SECTIONS.map((s) => (
          <div key={s.title} className="flex items-center justify-between sm:justify-start gap-1.5">
            <span className="text-xs text-gray-500">{SECTION_SHORT[s.title] || s.title}</span>
            <span className={`text-xs font-bold tabular-nums ${counts[s.title] ? "text-red-600" : "text-gray-300"}`}>
              {counts[s.title]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiSelect({ allLabel, unit, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (k) => onChange(selected.includes(k) ? selected.filter((n) => n !== k) : [...selected, k]);
  const visible = q.trim() ? options.filter((k) => k.toLowerCase().includes(q.toLowerCase())) : options;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap">
        {selected.length === 0 ? allLabel : `${selected.length} ${unit}`}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[220px]">
          <div className="px-2 pt-2 pb-1.5 border-b border-gray-100">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm..."
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {visible.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Không tìm thấy</p>}
            {visible.map((k) => (
              <label key={k} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" checked={selected.includes(k)} onChange={() => toggle(k)} className="accent-indigo-600" />
                {k}
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1.5">
              <button onClick={() => onChange([])} className="text-xs text-indigo-600 hover:text-indigo-800">Xóa bộ lọc</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ r }) {
  const { notes, photos } = useMemo(() => notesOf(r), [r]);
  return (
    <div className="space-y-2 text-xs">
      {r._faults.length === 0 ? (
        <p className="text-green-700">Không có mục không đạt.</p>
      ) : (
        <ul className="space-y-1">
          {r._faults.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 h-fit">{SECTION_SHORT[f.section] || f.section}</span>
              <span className="text-gray-700">{f.label} — <b className="text-red-600">{f.value}</b></span>
            </li>
          ))}
        </ul>
      )}
      {notes.map((n, i) => (
        <p key={i} className="text-gray-600"><span className="text-gray-400">{n.label}: </span>{n.value}</p>
      ))}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {photos.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer">
              <img src={driveThumb(u, 200)} alt="" className="w-16 h-16 object-cover rounded border border-gray-200" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultBadge({ n }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${n ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
      {n ? `${n} mục` : "Đạt"}
    </span>
  );
}

function ChecklistRow({ r, showCvan }) {
  const [open, setOpen] = useState(false);
  const n = r._faults.length;
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer select-none" onClick={() => setOpen((p) => !p)}>
        <td className="px-3 py-2.5 w-6">
          {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtTime(r.created_at)}</td>
        {showCvan && <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{r.cvan_name}</td>}
        <td className="px-3 py-2.5 text-xs font-medium text-gray-800 whitespace-nowrap">{r.sap}</td>
        <td className="px-3 py-2.5 text-xs text-gray-700">{r.store_name}</td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {[...new Set(r._faults.map((f) => f.section))].map((s) => (
              <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{SECTION_SHORT[s] || s}</span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2.5 text-center"><ResultBadge n={n} /></td>
      </tr>
      {open && (
        <tr className="bg-indigo-50/40 border-l-2 border-indigo-300">
          <td />
          <td colSpan={showCvan ? 6 : 5} className="px-4 py-3"><Detail r={r} /></td>
        </tr>
      )}
    </>
  );
}

function ChecklistCard({ r, showCvan }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((p) => !p)} className="w-full text-left px-4 py-3.5 active:bg-gray-50 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{r.sap}{r.store_name ? ` — ${r.store_name}` : ""}</p>
          <p className="text-xs text-gray-500 mt-0.5">{fmtTime(r.created_at)}{showCvan ? ` · ${r.cvan_name}` : ""}</p>
        </div>
        <ResultBadge n={r._faults.length} />
      </button>
      {open && <div className="px-4 pb-3.5 bg-indigo-50/40 pt-2"><Detail r={r} /></div>}
    </div>
  );
}

function CvanStatsTable({ rows, managerOf }) {
  const by = {};
  rows.forEach((r) => {
    const k = r.cvan_name || "—";
    const e = (by[k] ||= { luot: 0, stores: new Set(), loi: 0, bySec: {} });
    e.luot++;
    if (r.sap) e.stores.add(r.sap);
    if (r._faults.length) e.loi++;
    r._faults.forEach((f) => { e.bySec[f.section] = (e.bySec[f.section] || 0) + 1; });
  });
  if (!Object.keys(by).length) return null;

  const groups = {};
  Object.entries(by).forEach(([name, e]) => {
    const m = managerOf[name] || "—";
    (groups[m] ||= []).push({ name, ...e });
  });
  const entries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "vi"));
  entries.forEach(([, l]) => l.sort((a, b) => a.name.localeCompare(b.name, "vi")));
  const cols = 4 + SECTIONS.length;
  const th = "px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap";

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <BarChart2 size={16} className="text-indigo-500" />
        <h3 className="text-sm font-bold text-gray-900">Thống kê theo CVAN</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-10">CVAN</th>
              <th className={th}>Lượt KT</th>
              <th className={th}>CH</th>
              <th className={th}>Có lỗi</th>
              {SECTIONS.map((s) => <th key={s.title} title={s.title} className={th}>{SECTION_SHORT[s.title] || s.title}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map(([mgr, list]) => {
              const tot = list.reduce((a, k) => ({ luot: a.luot + k.luot, stores: a.stores + k.stores.size }), { luot: 0, stores: 0 });
              return (
                <React.Fragment key={mgr}>
                  <tr className="bg-indigo-50/50">
                    <td colSpan={cols} className="px-4 py-1.5 font-semibold text-indigo-700 sticky left-0 bg-indigo-50/50">
                      {mgr}<span className="ml-2 font-normal text-indigo-400">{tot.luot} lượt · {tot.stores} CH</span>
                    </td>
                  </tr>
                  {list.map((k) => (
                    <tr key={k.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2 pl-8 text-gray-700 whitespace-nowrap sticky left-0 bg-white">{k.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.luot}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.stores.size}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">{k.loi}</td>
                      {SECTIONS.map((s) => {
                        const c = k.bySec[s.title] || 0;
                        return (
                          <td key={s.title} className="px-3 py-2 text-right tabular-nums">
                            <span className={c ? "font-semibold text-red-600" : "text-gray-200"}>{c || "—"}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const ChecklistReport = () => {
  const user = useStore((s) => s.data.user);
  const emps = useStore((s) => s.data.emps);
  const addToast = useStore((s) => s.addToast);
  const showCvan = user.title !== "chuyen_vien";

  const init = thisMonth();
  const [range, setRange] = useState({ start: init.start, end: init.end });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [managerOf, setManagerOf] = useState({});
  const [searchText, setSearchText] = useState("");
  const [selSection, setSelSection] = useState([]);
  const [selCvan, setSelCvan] = useState([]);
  const [onlyFault, setOnlyFault] = useState("");
  const [tab, setTab] = useState("ch");

  // Trưởng phòng xem tất cả; trưởng bộ phận xem mình + chuyên viên dưới quyền; chuyên viên chỉ xem của mình.
  const names = useMemo(() => {
    if (user.title === "truong_phong") return null;
    if (user.title === "truong_bo_phan") return [...new Set([user.name, ...emps])];
    return [user.name];
  }, [user, emps]);

  const fetchData = useCallback(async (s, e) => {
    setLoading(true);
    const r = await checklistApi.list({ names, dateFrom: s, dateTo: e });
    setLoading(false);
    if (r.success) setItems(r.data.map((x) => ({ ...x, _faults: faultsOf(x) })));
    else addToast("Không tải được dữ liệu: " + r.message, "error");
  }, [names, addToast]);

  useEffect(() => { fetchData(init.start, init.end); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showCvan) return;
    listUsers().then((us) => {
      const nameOf = Object.fromEntries(us.map((u) => [u.username, u.full_name]));
      setManagerOf(Object.fromEntries(us.filter((u) => u.manager).map((u) => [u.full_name, nameOf[u.manager]])));
    }).catch(() => {});
  }, [showCvan]);

  const applyRange = (s, e) => { setRange({ start: s, end: e }); fetchData(s, e); };

  const cvanList = useMemo(
    () => [...new Set(items.map((i) => i.cvan_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")),
    [items]
  );

  const filtered = useMemo(() => {
    let r = items;
    const q = searchText.trim().toLowerCase();
    if (q) r = r.filter((i) => `${i.sap} ${i.store_name || ""}`.toLowerCase().includes(q));
    if (selSection.length) r = r.filter((i) => i._faults.some((f) => selSection.includes(f.section)));
    if (selCvan.length) r = r.filter((i) => selCvan.includes(i.cvan_name));
    if (onlyFault === "fault") r = r.filter((i) => i._faults.length);
    if (onlyFault === "ok") r = r.filter((i) => !i._faults.length);
    return r;
  }, [items, searchText, selSection, selCvan, onlyFault]);

  const stores = new Set(filtered.map((i) => i.sap).filter(Boolean)).size;
  const withFault = filtered.filter((i) => i._faults.length).length;
  const totalFaults = filtered.reduce((n, i) => n + i._faults.length, 0);
  const filtering = searchText || selSection.length || selCvan.length || onlyFault;
  const tabBtn = (id) =>
    `px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === id ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"}`;

  return (
    <div className="p-2 sm:p-0 space-y-4">
      {loading && <LoadingModal message="Đang tải..." />}

      {/* Bộ lọc */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 sm:flex-none min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
            <input type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} className={`${INPUT} w-full`} />
          </div>
          <div className="flex-1 sm:flex-none min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
            <input type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} className={`${INPUT} w-full`} />
          </div>
          <button onClick={() => fetchData(range.start, range.end)}
            className="px-4 py-2.5 sm:py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Xem</button>
          <div className="flex gap-2">
            <button onClick={() => { const r = thisMonth(); applyRange(r.start, r.end); }}
              className="px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Tháng này</button>
            <button onClick={() => { const r = prevMonth(); applyRange(r.start, r.end); }}
              className="px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Tháng trước</button>
          </div>
          <div className="relative flex-1 min-w-[160px] sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Mã CH / tên CH..." value={searchText} onChange={(e) => setSearchText(e.target.value)}
              className={`${INPUT} w-full pl-8 pr-7`} />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <MultiSelect allLabel="Tất cả hạng mục" unit="hạng mục" options={SECTIONS.map((s) => s.title)} selected={selSection} onChange={setSelSection} />
          {showCvan && <MultiSelect allLabel="Tất cả CVAN" unit="CVAN" options={cvanList} selected={selCvan} onChange={setSelCvan} />}
          <select value={onlyFault} onChange={(e) => setOnlyFault(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Tất cả kết quả</option>
            <option value="fault">Có mục không đạt</option>
            <option value="ok">Đạt toàn bộ</option>
          </select>
          {filtering && <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length}/{items.length}</span>}
          <button onClick={() => downloadCsv(filtered, range.start, range.end)} disabled={filtered.length === 0}
            className="sm:ml-auto w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 sm:py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={15} /> Tải CSV
          </button>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-[repeat(4,minmax(110px,150px))_1fr] gap-3 items-stretch">
        <StatCard label="Cửa hàng" value={stores} />
        <StatCard label="Lượt checklist" value={filtered.length} />
        <StatCard label="Có mục không đạt" value={withFault} tone={withFault ? "text-red-600" : undefined}
          sub={filtered.length ? `${Math.round((withFault / filtered.length) * 100)}%` : undefined} />
        <StatCard label="Tổng mục không đạt" value={totalFaults} tone={totalFaults ? "text-red-600" : undefined} />
        <div className="col-span-2 lg:col-span-1"><SectionBreakdown rows={filtered} /></div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("ch")} className={tabBtn("ch")}>Theo cửa hàng</button>
        {showCvan && <button onClick={() => setTab("cvan")} className={tabBtn("cvan")}>Theo CVAN</button>}
      </div>

      {tab === "ch" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-100">
            <BarChart2 size={18} className="text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900">Danh sách checklist</h2>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">{items.length === 0 ? "Không có dữ liệu trong khoảng thời gian này" : "Không có kết quả phù hợp"}</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-y border-gray-100">
                    <tr>
                      <th className="w-6" />
                      {["Thời gian", ...(showCvan ? ["CVAN"] : []), "Mã CH", "Tên CH", "Hạng mục có lỗi", "Kết quả"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((r) => <ChecklistRow key={r.id} r={r} showCvan={showCvan} />)}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((r) => <ChecklistCard key={r.id} r={r} showCvan={showCvan} />)}
              </div>
            </>
          )}
        </div>
      )}

      {showCvan && tab === "cvan" && <CvanStatsTable rows={filtered} managerOf={managerOf} />}
    </div>
  );
};

export default ChecklistReport;
