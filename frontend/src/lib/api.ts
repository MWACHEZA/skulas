import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';

export const BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Only retry transient network or 5xx errors on GET requests (never retry 4xx/429/404)
axiosRetry(api, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    if (error.config?.method?.toLowerCase() !== 'get') return false;
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;
    return axiosRetry.isNetworkOrIdempotentRequestError(error);
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  // Attach token from localStorage only if an Authorization header is not already explicitly provided
  if (!config.headers.Authorization && !config.headers.authorization) {
    const token = localStorage.getItem('acadex_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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

  // Clear GET micro-cache whenever a mutation occurs so subsequent GETs fetch fresh data
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    getResponseCache.clear();
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
          const path = window.location.pathname;
          let targetLogin = '/';
          if (path.startsWith('/bursar')) targetLogin = '/bursar/login';
          else if (path.startsWith('/admin')) targetLogin = '/admin/login';
          else if (path.startsWith('/teacher')) targetLogin = '/teacher/login';
          else if (path.startsWith('/student')) targetLogin = '/student/login';
          window.location.href = targetLogin;
        }
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Frontend GET Request Deduplication & 2s Micro-Cache (Client-Side Rate Limiter)
// Prevents duplicate concurrent API calls when multiple components mount together
// ---------------------------------------------------------------------------
const inFlightGets = new Map<string, Promise<AxiosResponse<any>>>();
const getResponseCache = new Map<string, { response: AxiosResponse<any>; expiresAt: number }>();
const GET_CACHE_TTL_MS = 2000;

const originalGet = api.get.bind(api);

api.get = function <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  config?: AxiosRequestConfig<D>
): Promise<R> {
  // Skip cache/dedupe for binary/blob downloads
  if (config?.responseType && config.responseType !== 'json') {
    return originalGet<T, R, D>(url, config);
  }

  const paramsKey = config?.params ? JSON.stringify(config.params) : '';
  const entityKey = localStorage.getItem('acadex_active_entity') || '';
  const cacheKey = `${url}?${paramsKey}|${entityKey}`;
  const now = Date.now();

  const cached = getResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.response as unknown as R);
  }

  const existingInFlight = inFlightGets.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight as unknown as Promise<R>;
  }

  const reqPromise = originalGet<T, AxiosResponse<T>, D>(url, config)
    .then((res) => {
      getResponseCache.set(cacheKey, {
        response: res,
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
      });
      if (getResponseCache.size > 300) {
        const oldestKey = getResponseCache.keys().next().value;
        if (oldestKey) getResponseCache.delete(oldestKey);
      }
      return res;
    })
    .finally(() => {
      inFlightGets.delete(cacheKey);
    });

  inFlightGets.set(cacheKey, reqPromise);
  return reqPromise as unknown as Promise<R>;
};

export default api;
