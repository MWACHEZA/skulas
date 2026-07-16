import axios from 'axios';
import axiosRetry from 'axios-retry';

export const BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => error.config?.method?.toLowerCase() === 'get',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const token = localStorage.getItem('acadex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject school code for strict multi-tenancy isolation
  try {
    const userStr = localStorage.getItem('acadex_user');
    const activeEntityStr = localStorage.getItem('acadex_active_entity');
    
    let schoolCode = null;
    
    // First try to get it from the active linked entity (Parent/Supplier portals)
    if (activeEntityStr) {
      const activeEntity = JSON.parse(activeEntityStr);
      if (activeEntity.schoolCode) {
        schoolCode = activeEntity.schoolCode;
      }
    } 
    
    // Fallback to user's direct school Code (Student/Teacher/Admin portals)
    if (!schoolCode && userStr) {
      const user = JSON.parse(userStr);
      if (user.schoolCode) {
        schoolCode = user.schoolCode;
      }
    }
    
    if (schoolCode) {
      config.headers['x-school-code'] = schoolCode;
    }
  } catch (e) {
    console.error('Failed to parse user/entity for headers', e);
  }

  return config;
});

// Handle 401 globally – clear stale session and redirect to home
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      window.dispatchEvent(new Event('acadex-network-error'));
    }

    if (error.response?.status === 401) {
      // Only clear if it's an API auth failure, not a generic proxy 401
      const isAuthError = error.response.headers['www-authenticate'] || error.response.data?.error;
      if (isAuthError) {
        const hadToken = !!localStorage.getItem('acadex_token');
        localStorage.removeItem('acadex_token');
        localStorage.removeItem('acadex_user');
        localStorage.removeItem('acadex_active_entity');
        // Only force-reload if we actually had a session (avoids loop on login page itself)
        if (hadToken && !window.location.pathname.includes('/login')) {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
