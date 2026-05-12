import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('planovate_token') || null,
  user: JSON.parse(localStorage.getItem('planovate_user') || 'null'),

  setAuth: (token, user) => {
    localStorage.setItem('planovate_token', token);
    localStorage.setItem('planovate_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('planovate_token');
    localStorage.removeItem('planovate_user');
    set({ token: null, user: null });
  },

  // Simulated role (admin can switch perspective)
  simulatedRole: null,
  setSimulatedRole: (role) => set({ simulatedRole: role }),
  clearSimulatedRole: () => set({ simulatedRole: null }),

  // Effective role = simulated || actual
  getEffectiveRole: () => {
    const state = get();
    return state.simulatedRole || state.user?.role || null;
  },

  isAuthenticated: () => !!get().token && !!get().user,
}));

export default useAuthStore;
