import React, { useState } from "react";
import LoadingModal from "../../components/LoadingModal";
import { api } from "../../api";
import useStore from "../../store/useStore";

const Login = () => {
  const setIsLogin = useStore((state) => state.setIsLogin);
  const setData    = useStore((state) => state.setData);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) { setError("Vui lòng nhập đầy đủ thông tin."); return; }
    try {
      setLoading(true);
      const result = await api.login({ username: username.toLowerCase(), password });
      if (result.success) {
        setData(result.data);
        setIsLogin(true);
      } else {
        setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      }
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-red-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="bg-red-800 px-8 py-6 text-center">
          <h1 className="text-2xl font-bold text-white tracking-wide">ANCS</h1>
          <p className="text-red-200 text-sm mt-1">Hệ thống quản lý ANCS</p>
        </div>

        <form onSubmit={handleLogin} className="px-8 py-7 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên đăng nhập</label>
            <input
              type="text"
              autoComplete="username"
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Đăng nhập
          </button>
        </form>
      </div>
      {loading && <LoadingModal message="Đang đăng nhập..." />}
    </div>
  );
};

export default Login;
