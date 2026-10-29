import { LogOut, Menu, RefreshCw, UserCircle } from 'lucide-react';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../store/useStore';

const PAGE_TITLES = {
  '/search':                'Tìm kiếm',
  '/checklist':             'Checklist ANCS',
  '/admin':                 'Quản trị tài khoản',
  '/visit-plan-management': 'Đăng ký lấy dữ liệu',
};

const Header = () => {
  const userName = useStore((state) => state.data.user?.name);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const refreshData = useStore((state) => state.refreshData);
  const addToast = useStore((state) => state.addToast);
  const logout = useStore((state) => state.logout);
  const location = useLocation();

  const pageTitle = Object.entries(PAGE_TITLES).find(([p]) => location.pathname.startsWith(p))?.[1] ?? 'ANCS';

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const ok = await refreshData();
    setIsRefreshing(false);
    if (ok) {
      addToast('Dữ liệu đã được cập nhật');
    } else {
      addToast('Không thể tải dữ liệu, thử lại sau', 'error');
    }
  };

  return (
    <header className="flex items-center justify-between h-16 bg-white shadow-md px-4 sticky top-0 z-30">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* App title — mobile center */}
      <span className="text-lg font-bold text-red-800 lg:hidden absolute left-1/2 -translate-x-1/2">
        ANCS
      </span>

      <span className="hidden lg:block text-base font-semibold text-gray-700">
        {pageTitle}
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Cập nhật dữ liệu"
        >
          <RefreshCw
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 px-2">
          <UserCircle className="w-7 h-7 text-indigo-500" />
          <span className="text-sm text-gray-700 hidden sm:block max-w-32 truncate">
            {userName}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
