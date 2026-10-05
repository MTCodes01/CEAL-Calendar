import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8100',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15-second timeout
  withCredentials: true,
});

// ---------------------------------------------------------------
// Token refresh mutex — prevents concurrent refresh race conditions
// ---------------------------------------------------------------
let isRefreshing = false;
let refreshQueue = [];
// We no longer need the request interceptor because browsers
// automatically attach HttpOnly cookies to requests to the same origin.


// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops
    const refreshUrl = '/api/auth/token/refresh/';
    if (error.response?.status === 401 && originalRequest.url === refreshUrl) {
      // Refresh failed, meaning refresh token is expired or invalid
      const isGuest = sessionStorage.getItem('guestMode') === 'true';
      const publicPaths = ['/login', '/signup', '/forgot-password'];
      const isPublicPath = publicPaths.includes(window.location.pathname) || 
                          window.location.pathname.startsWith('/reset-password/');
      
      if (!isPublicPath && !isGuest) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Don't try to refresh if the failed request was login or signup
    const authUrls = ['/api/auth/login/', '/api/auth/signup/'];
    if (error.response?.status === 401 && authUrls.includes(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Try to refresh the token on any subsequent 401 — but NOT in guest mode
    const isGuestForRefresh = sessionStorage.getItem('guestMode') === 'true';
    if (error.response?.status === 401 && !originalRequest._retry && !isGuestForRefresh) {
      originalRequest._retry = true;

      try {
        // Automatically sends the refresh_token cookie
        await api.post(refreshUrl);

        // Retry original request (browser will automatically send the new HTTPOnly access_token cookie)
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear local state and redirect to login
        // EXCLUSION: Don't redirect if we are on login, signup, password reset, or in guest mode
        const isGuest = sessionStorage.getItem('guestMode') === 'true';
        const publicPaths = ['/login', '/signup', '/forgot-password'];
        const isPublicPath = publicPaths.includes(window.location.pathname) || 
                            window.location.pathname.startsWith('/reset-password/');
        
        if (!isPublicPath && !isGuest) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
