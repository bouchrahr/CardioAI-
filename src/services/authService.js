import api from './api';

const authService = {

  // ── Login → retourne { token, user, role } ──
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, role, user } = response.data;

    // Sauvegarder dans localStorage
    localStorage.setItem('cardioai_token', access_token);
    localStorage.setItem('cardioai_user', JSON.stringify({ ...user, role, full_name: `${user.first_name} ${user.last_name}` }));

    return { token: access_token, user: { ...user, role } };
  },

  // ── Logout ──
  logout: () => {
    localStorage.removeItem('cardioai_token');
    localStorage.removeItem('cardioai_user');
  },

  // ── Récupérer le user connecté depuis localStorage ──
  getCurrentUser: () => {
    const raw = localStorage.getItem('cardioai_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  // ── Vérifier si connecté ──
  isAuthenticated: () => {
    return !!localStorage.getItem('cardioai_token');
  },
};

export default authService;