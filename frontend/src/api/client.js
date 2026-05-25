import axios from 'axios';

// Agar website production (Vercel) par chal rahi hai toh Render ka URL use hoga, warna local dev proxy
const isProduction = import.meta.env.PROD; 
const BACKEND_URL = isProduction ? 'https://nishani.onrender.com' : '';

const api = axios.create({ 
  baseURL: `${BACKEND_URL}/api` 
});

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