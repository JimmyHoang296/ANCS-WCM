import React, { useState } from "react";
import { Save, Search, Trash2, X } from "lucide-react";
import { api } from "../../api";
import { checklistApi } from "../../api/checklist";
import useStore from "../../store/useStore";
import LoadingModal from "../../components/LoadingModal";
import PhotoField from "./PhotoField";
import { ALL_FIELDS, INSPECTOR_TITLES, SECTIONS } from "./checklistSchema";

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500";
const BAD = ["Không đạt", "Không đảm bảo"];

const ChecklistFormModal = ({ record, onClose, onSaved, onDeleted }) => {
  const user = useStore((s) => s.data.user);
  const addToast = useStore((s) => s.addToast);
  const isNew = !record?.id;
  const canEdit = isNew || record.cvan_user === user.id || user.role === "hod";

  const [form, setForm] = useState(() =>
    isNew
      ? { sap: "", store_name: "", cvan_user: user.id, cvan_name: user.name, area_cvan: "",
          inspector_title: INSPECTOR_TITLES[0] }
      : { ...record }
  );
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const lookupStore = async () => {
    if (!form.sap?.trim()) { addToast("Nhập mã SAP trước", "error"); return; }
    setLoading(true);
    const r = await api.searchStore({ site: form.sap.trim() });
    setLoading(false);
    const s = r.result?.find((x) => String(x.site) === form.sap.trim()) || r.result?.[0];
    if (!s) { addToast("Không tìm thấy cửa hàng", "error"); return; }
    setForm((f) => ({ ...f, sap: String(s.site), store_name: s.siteName || "", area_cvan: f.area_cvan || s.cvAnNinh || "" }));
  };

  const handleSave = async () => {
    if (!form.sap?.trim()) { addToast("Bắt buộc nhập mã SAP", "error"); return; }
    for (const f of ALL_FIELDS) {
      if (!f.required || (f.showIf && !f.showIf(form))) continue;
      if (form[f.key] === undefined || form[f.key] === null || form[f.key] === "") {
        addToast(`Chưa điền: ${f.label}`, "error"); return;
      }
    }
    setLoading(true);
    const r = isNew ? await checklistApi.create(form) : await checklistApi.update(record.id, form);
    setLoading(false);
    if (r.success) { addToast("Đã lưu checklist"); onSaved(r.data, isNew); onClose(); }
    else addToast(r.message || "Không lưu được", "error");
  };

  const handleDelete = async () => {
    if (!window.confirm("Xóa checklist này?")) return;
    setLoading(true);
    const r = await checklistApi.remove(record.id);
    setLoading(false);
    if (r.success) { addToast("Đã xóa"); onDeleted(record.id); onClose(); }
    else addToast(r.message || "Không xóa được", "error");
  };

  const renderField = (f) => {
    if (f.showIf && !f.showIf(form)) return null;
    const v = form[f.key];
    const bad = BAD.includes(v);
    let control;
    if (f.type === "select") {
      control = (
        <select value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} disabled={!canEdit}
          className={`${INPUT} ${bad ? "border-red-300 text-red-700" : ""}`}>
          <option value="">— Chọn —</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    } else if (f.type === "textarea") {
      control = <textarea rows={2} value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} disabled={!canEdit} className={INPUT} />;
    } else if (f.type === "photos") {
      control = <PhotoField value={v || []} max={f.max} disabled={!canEdit} onChange={(urls) => set(f.key, urls)} onError={(m) => addToast(m, "error")} />;
    } else {
      control = <input type={f.type === "int" ? "number" : "text"} min={f.type === "int" ? 0 : undefined}
        value={v ?? ""} onChange={(e) => set(f.key, e.target.value)} disabled={!canEdit} className={INPUT} />;
    }
    return (
      <div key={f.key} className={f.type === "textarea" || f.type === "photos" || f.label.length > 70 ? "sm:col-span-2" : ""}>
        <label className="block text-sm text-gray-700 mb-1">
          {f.label}{f.required && <span className="text-red-500"> *</span>}
        </label>
        {f.hint && <p className="text-xs text-gray-400 mb-1">{f.hint}</p>}
        {control}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-0 sm:p-6">
      <div className="bg-white w-full max-w-3xl sm:rounded-xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b sm:rounded-t-xl">
          <h3 className="font-semibold text-gray-800">
            {isNew ? "Checklist ANAT & PCCC mới" : `Checklist #${record.id}`}
            {!canEdit && <span className="ml-2 text-xs font-normal text-gray-400 italic">Chỉ xem</span>}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Mã SAP cơ sở <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input value={form.sap ?? ""} onChange={(e) => set("sap", e.target.value)} disabled={!canEdit} className={INPUT} />
                {canEdit && (
                  <button type="button" onClick={lookupStore} title="Tra cứu cửa hàng"
                    className="px-3 rounded-lg border border-gray-200 text-indigo-600 hover:bg-indigo-50"><Search size={16} /></button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Tên cửa hàng</label>
              <input value={form.store_name ?? ""} onChange={(e) => set("store_name", e.target.value)} disabled={!canEdit} className={INPUT} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Người kiểm tra</label>
              <input value={form.cvan_name ?? ""} disabled className={INPUT} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Chức danh người kiểm tra</label>
              <select value={form.inspector_title ?? ""} onChange={(e) => set("inspector_title", e.target.value)} disabled={!canEdit} className={INPUT}>
                {INSPECTOR_TITLES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Cơ sở thuộc địa bàn phụ trách của CVAN</label>
              <input value={form.area_cvan ?? ""} onChange={(e) => set("area_cvan", e.target.value)} disabled={!canEdit} className={INPUT} />
            </div>
          </section>

          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-3">
              <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide border-b border-indigo-100 pb-1">{s.title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {s.fields.map(renderField)}
              </div>
            </section>
          ))}
        </div>

        {canEdit && (
          <div className="sticky bottom-0 flex items-center justify-between px-5 py-3 bg-white border-t sm:rounded-b-xl">
            {!isNew ? (
              <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50">
                <Trash2 size={16} /> Xóa
              </button>
            ) : <span />}
            <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              <Save size={16} /> Lưu
            </button>
          </div>
        )}
      </div>
      {loading && <LoadingModal message="Đang xử lý..." />}
    </div>
  );
};

export default ChecklistFormModal;
