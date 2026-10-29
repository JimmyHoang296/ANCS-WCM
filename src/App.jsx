import { Routes, Route, Navigate } from "react-router-dom";
import SearchStore from "./pages/searchStore/SearchStore";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ViolationManager from "./pages/violation/ViolationManager";
import VisitPlanManager from "./pages/visitPlan/VisitPlanManager";
import AdminPage from "./pages/admin/AdminPage";
import ChecklistManager from "./pages/checklist/ChecklistManager";
import Login from "./pages/login/Login";
import useStore from "./store/useStore";
import { Toast } from "./components/Toast";

const App = () => {
  const isLogin = useStore((state) => state.isLogin);
  const isAdmin = useStore((state) => state.data.user?.isAdmin);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);

  return (
    <>
      <Toast />
      {!isLogin ? (
        <Login />
      ) : (
        <div className="flex min-h-screen bg-gray-100 font-sans">
          <Sidebar />
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
            <Header />
            <main className="flex-1 p-0.5 overflow-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/search" replace />} />
                <Route path="/search" element={<SearchStore />} />
                <Route path="/checklist" element={<ChecklistManager />} />
                <Route path="/violation-management" element={<ViolationManager />} />
                <Route path="/visit-plan-management" element={<VisitPlanManager />} />
                {isAdmin && <Route path="/admin" element={<AdminPage />} />}
                <Route path="*" element={<Navigate to="/search" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
