// src/services/authService.js - ENHANCED WITH SESSION MANAGEMENT
import api from "../api/axios";

export const authService = {
  /**
   * Register new user
   */
  register: async (username, email, password) => {
    const response = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    return response.data.data || response.data;
  },

  /**
   * Login user
   */
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });

    // Backend returns: { success: true, data: { accessToken, expiresIn, user } }
    const { accessToken, expiresIn, user } =
      response.data.data || response.data;

    // Store token with expiry
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("tokenExpiry", Date.now() + (expiresIn || 900) * 1000);

    return { user, accessToken, expiresIn };
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("tokenExpiry");
    }
  },

  /**
   * Logout from all devices
   */
  logoutAll: async () => {
    try {
      const response = await api.post("/auth/logout-all");
      return response.data.data || response.data;
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("tokenExpiry");
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data.data?.user || response.data.user;
  },

  /**
   * Refresh access token
   */
  refreshToken: async () => {
    const response = await api.post("/auth/refresh");
    const { accessToken, expiresIn } = response.data.data || response.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("tokenExpiry", Date.now() + (expiresIn || 900) * 1000);

    return { accessToken, expiresIn };
  },

  /**
   * ENHANCEMENT: Get all active sessions
   */
  getSessions: async () => {
    const response = await api.get("/auth/sessions");
    return response.data.data || response.data;
  },

  /**
   * ENHANCEMENT: Revoke specific session
   */
  revokeSession: async (sessionId) => {
    const response = await api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: () => {
    const expiry = localStorage.getItem("tokenExpiry");
    if (!expiry) return true;

    return Date.now() >= parseInt(expiry);
  },

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiry: () => {
    const expiry = localStorage.getItem("tokenExpiry");
    if (!expiry) return 0;

    const remaining = parseInt(expiry) - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  },
};
