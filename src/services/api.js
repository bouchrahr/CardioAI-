import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Injecte automatiquement le token JWT dans chaque requête ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cardioai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Si token expiré (401) → redirige vers login ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cardioai_token');
      localStorage.removeItem('cardioai_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;