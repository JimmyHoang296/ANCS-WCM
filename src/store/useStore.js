import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api';

const emptyData = {
  user: {},
  visitPlan: [],
  emps: [],
};

const useStore = create(
  persist(
    (set, get) => ({
      data: emptyData,
      isLogin: false,
      isSidebarOpen: window.innerWidth >= 1024,
      toasts: [],
      refreshKey: 0,

      setIsLogin: (status) => set({ isLogin: status }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setData: (updater) =>
        set((state) => ({
          data:
            typeof updater === 'function'
              ? updater(state.data)
              : { ...state.data, ...updater },
        })),

      addToast: (message, type = 'success') =>
        set((state) => ({
          toasts: [...state.toasts, { id: Date.now(), message, type }],
        })),

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      // Re-fetch all data from server using stored user ID
      refreshData: async () => {
        const userId = get().data.user?.id;
        if (!userId) return false;
        try {
          const result = await api.refreshData(userId);
          if (result.success) {
            set((s) => ({ data: result.data, refreshKey: s.refreshKey + 1 }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      logout: () => set({ isLogin: false, data: emptyData }),
    }),
    {
      name: 'ancs-session',
      // Only persist login state and user data — not UI state or toasts
      partialize: (state) => ({
        isLogin: state.isLogin,
        data: state.data,
      }),
    }
  )
);

export default useStore;
