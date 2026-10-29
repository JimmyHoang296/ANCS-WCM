import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { TITLES, createUser, listUsers, resetPassword, updateUser } from "../../api/ancsUsers";
import useStore from "../../store/useStore";
import LoadingModal from "../../components/LoadingModal";

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const MIN_PASSWORD = 6;

const AdminPage = () => {
  const me = useStore((s) => s.data.user);
  const addToast = useStore((s) => s.addToast);
  const isTruongPhong = me?.title === "truong_phong";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const emptyForm = { username: "", fullName: "", password: "", title: "chuyen_vien", manager: "" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch {
      addToast("Không tải được danh sách tài khoản", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  // Trưởng phòng quản lý tất cả; trưởng bộ phận chỉ quản lý chuyên viên của mình.
  const canManage = (u) =>
    u.username !== me.id &&
    (isTruongPhong || (u.title === "chuyen_vien" && u.manager === me.id));

  const visible = users.filter((u) => isTruongPhong || u.username === me.id || u.manager === me.id);
  const heads = users.filter((u) => u.title === "truong_bo_phan" && u.active);
  const nameOf = (username) => users.find((u) => u.username === username)?.full_name || "—";

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    // Phía trưởng bộ phận luôn tạo chuyên viên dưới quyền chính mình
    const title = isTruongPhong ? form.title : "chuyen_vien";
    const manager = isTruongPhong ? (title === "chuyen_vien" ? form.manager : "") : me.id;
    if (!/^[a-z0-9._-]{3,}$/i.test(form.username.trim())) {
      addToast("Tên đăng nhập tối thiểu 3 ký tự (chữ, số, . _ -)", "error"); return;
    }
    if (!form.fullName.trim()) { addToast("Vui lòng nhập họ tên", "error"); return; }
    if (form.password.length < MIN_PASSWORD) {
      addToast(`Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự`, "error"); return;
    }
    if (title === "chuyen_vien" && !manager) { addToast("Chọn trưởng bộ phận phụ trách", "error"); return; }

    setLoading(true);
    const r = await createUser({ ...form, title, manager, createdBy: me.id });
    setLoading(false);
    if (r.success) {
      addToast("Đã tạo tài khoản");
      setForm(emptyForm);
      load();
    } else {
      addToast(r.message || "Không tạo được tài khoản", "error");
    }
  };

  const toggleActive = async (u) => {
    setLoading(true);
    const r = await updateUser(u.username, { active: !u.active });
    setLoading(false);
    if (r.success) { addToast(u.active ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản"); load(); }
    else addToast(r.message || "Thao tác thất bại", "error");
  };

  const handleReset = async (u) => {
    const pw = window.prompt(`Mật khẩu mới cho ${u.full_name} (tối thiểu ${MIN_PASSWORD} ký tự):`);
    if (pw === null) return;
    if (pw.length < MIN_PASSWORD) { addToast(`Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự`, "error"); return; }
    setLoading(true);
    const r = await resetPassword(u.username, pw);
    setLoading(false);
    addToast(r.success ? "Đã đặt lại mật khẩu" : r.message || "Thao tác thất bại", r.success ? "success" : "error");
  };

  return (
    <div className="p-3 sm:p-5 space-y-5 max-w-5xl">
      {loading && <LoadingModal />}

      <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-base font-semibold text-gray-700">
          {isTruongPhong ? "Tạo tài khoản mới" : "Tạo tài khoản chuyên viên an ninh"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input name="username" value={form.username} onChange={handleChange} placeholder="Tên đăng nhập" className={INPUT} autoComplete="off" />
          <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Họ tên (trùng tên KSTT trong ghi nhận)" className={INPUT} />
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mật khẩu ban đầu" className={INPUT} autoComplete="new-password" />
          {isTruongPhong && (
            <select name="title" value={form.title} onChange={handleChange} className={INPUT}>
              <option value="chuyen_vien">{TITLES.chuyen_vien}</option>
              <option value="truong_bo_phan">{TITLES.truong_bo_phan}</option>
              <option value="truong_phong">{TITLES.truong_phong}</option>
            </select>
          )}
          {isTruongPhong && form.title === "chuyen_vien" && (
            <select name="manager" value={form.manager} onChange={handleChange} className={INPUT}>
              <option value="">— Trưởng bộ phận phụ trách —</option>
              {heads.map((h) => <option key={h.username} value={h.username}>{h.full_name}</option>)}
            </select>
          )}
        </div>
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Tạo tài khoản
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Tên đăng nhập</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Chức danh</th>
              <th className="px-4 py-3">Phụ trách bởi</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((u) => (
              <tr key={u.username} className={u.active ? "" : "bg-gray-50 text-gray-400"}>
                <td className="px-4 py-2.5 font-mono">{u.username}</td>
                <td className="px-4 py-2.5">{u.full_name}</td>
                <td className="px-4 py-2.5">{TITLES[u.title]}</td>
                <td className="px-4 py-2.5">{u.manager ? nameOf(u.manager) : "—"}</td>
                <td className="px-4 py-2.5">{u.active ? "Hoạt động" : "Đã khóa"}</td>
                <td className="px-4 py-2.5">
                  {canManage(u) && (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleReset(u)} title="Đặt lại mật khẩu" className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                        <KeyRound size={16} />
                      </button>
                      <button onClick={() => toggleActive(u)} title={u.active ? "Khóa" : "Mở khóa"}
                        className={`p-1.5 rounded-lg ${u.active ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                        {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Chưa có tài khoản</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
