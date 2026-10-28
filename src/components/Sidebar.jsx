import { ChevronLeft, DownloadCloud, Menu, Search, Store, User } from "lucide-react";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import useStore from "../store/useStore";

const navItems = [
  { name: "Tìm kiếm", icon: <Search size={20} />, page: "/search" },
  { name: "Ghi nhận", icon: <DownloadCloud size={20} />, page: "/violation-management" },
  { name: "Lịch BM", icon: <Store size={20} />, page: "/visit-plan-management" },
];

const Sidebar = () => {
  const user = useStore((state) => state.data.user);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const location = useLocation();

  // On mobile, close sidebar after navigating
  const handleNavClick = () => {
    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <>
      {/* Mobile backdrop — click to close */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white shadow-xl
          transition-all duration-300 ease-in-out
          w-64
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-16"}
        `}
      >
        {/* Top: logo + collapse button */}
        <div className="flex items-center justify-between h-16 px-4 border-b flex-shrink-0">
          <span
            className={`text-xl font-bold text-red-800 whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
              }`}
          >
            ANCS
          </span>
          {/* Desktop toggle button */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
            title={isSidebarOpen ? "Thu gọn" : "Mở rộng"}
          >
            <ChevronLeft
              size={18}
              className={`transition-transform duration-300 ${isSidebarOpen ? "" : "rotate-180"}`}
            />
          </button>
          {/* Mobile close button */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.page);
              return (
                <li key={item.name}>
                  <Link
                    to={item.page}
                    onClick={handleNavClick}
                    title={!isSidebarOpen ? item.name : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-colors duration-200 group
                      ${isActive
                        ? "bg-indigo-500 text-white"
                        : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                      }
                    `}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span
                      className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                        }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: user info */}
        <div
          className={`flex items-center gap-3 px-4 py-4 border-t text-gray-500 flex-shrink-0 ${isSidebarOpen ? "" : "justify-center"
            }`}
        >
          <User size={18} className="flex-shrink-0" />
          <span
            className={`text-sm truncate transition-all duration-300 ${isSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
              }`}
          >
            {user?.name}
          </span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
