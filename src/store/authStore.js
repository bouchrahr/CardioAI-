import { create } from 'zustand';
import authService from '../services/authService';

const useAuthStore = create((set) => ({
  user:    authService.getCurrentUser(),
  token:   localStorage.getItem('cardioai_token'),
  loading: false,
  error:   null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { token, user } = await authService.login(email, password);
      set({ user, token, loading: false });
      return { success: true, role: user.role };
    } catch (err) {
      const message = err.response?.data?.detail || 'Identifiants incorrects';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;