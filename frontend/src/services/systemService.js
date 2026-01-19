// src/services/systemService.js - NEW FILE
// Comprehensive system monitoring service aligned with backend

import api from "../api/axios";

export const systemService = {
  /**
   * Get complete system health
   * GET /api/system/health
   */
  getHealth: async () => {
    const response = await api.get("/system/health");
    return response.data.data || response.data;
  },

  /**
   * Get Redis connection status
   * GET /api/system/redis-status
   */
  getRedisStatus: async () => {
    const response = await api.get("/system/redis-status");
    return response.data.data || response.data;
  },

  /**
   * Get guest rate limiting statistics
   * GET /api/system/guest-stats
   */
  getGuestStats: async () => {
    const response = await api.get("/system/guest-stats");
    return response.data.data || response.data;
  },

  /**
   * Clear guest memory store (requires auth)
   * POST /api/system/clear-guest-store
   */
  clearGuestStore: async () => {
    const response = await api.post("/system/clear-guest-store");
    return response.data;
  },

  /**
   * Get database statistics (requires auth)
   * GET /api/system/database-stats
   */
  getDatabaseStats: async () => {
    const response = await api.get("/system/database-stats");
    return response.data.data || response.data;
  },

  /**
   * Get storage statistics (requires auth)
   * GET /api/system/storage-stats
   */
  getStorageStats: async () => {
    const response = await api.get("/system/storage-stats");
    return response.data.data || response.data;
  },

  /**
   * Get CSP violation statistics (requires auth)
   * GET /api/system/csp-stats
   */
  getCspStats: async () => {
    const response = await api.get("/system/csp-stats");
    return response.data.data || response.data;
  },

  /**
   * Test guest rate limiting
   * POST /api/system/test-guest-limit
   */
  testGuestLimit: async () => {
    const response = await api.post("/system/test-guest-limit");
    return response.data.data || response.data;
  },
};
