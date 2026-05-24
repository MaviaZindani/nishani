import axios from 'axios';

// All requests go to /api (proxied to the Express backend in dev).
const api = axios.create({ baseURL: '/api' });

// Attach the admin JWT to every request when one is stored.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nishani_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Surface a clean message from API error responses.
export function apiError(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong';
}

export default api;
