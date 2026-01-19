// ============================================================================
// 1. src/api/axios.js - CORRECTED & ALIGNED
// ============================================================================
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Send cookies for refresh token
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Match backend REQUEST_TIMEOUT
});

// Request Interceptor - Add access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle TOKEN_EXPIRED (match backend error code exactly)
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint (uses httpOnly cookie)
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Store new access token
        const newToken = data.data?.accessToken || data.accessToken;
        const expiresIn = data.data?.expiresIn || data.expiresIn || 900; // Default 15min

        localStorage.setItem("accessToken", newToken);
        localStorage.setItem("tokenExpiry", Date.now() + expiresIn * 1000);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem("accessToken");
        localStorage.removeItem("tokenExpiry");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
