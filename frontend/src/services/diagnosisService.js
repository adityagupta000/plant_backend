// src/services/diagnosisService.js - FULLY ALIGNED WITH BACKEND
import api from "../api/axios";

export const diagnosisService = {
  /**
   * GUEST MODE - No authentication required
   * POST /api/guest/predict
   */
  diagnoseStateless: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post("/guest/predict", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data.data || response.data;
  },

  /**
   * GUEST PDF DOWNLOAD - Returns feature gate error
   * POST /api/guest/predict/download-pdf
   */
  downloadGuestPDF: async (prediction) => {
    const response = await api.post(
      "/guest/predict/download-pdf",
      { prediction },
      { responseType: "blob" },
    );

    // This will throw 403 with login prompt from backend
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plant_diagnosis_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  },

  /**
   * AUTHENTICATED MODE - Saves to history
   * POST /api/predict
   */
  diagnoseWithHistory: async (file, sessionId = null) => {
    const formData = new FormData();
    formData.append("image", file);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    const response = await api.post("/predict", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data.data || response.data;
  },

  /**
   * Create new session
   * POST /api/predict/session
   */
  createSession: async (title = null) => {
    const response = await api.post("/predict/session", { title });
    return response.data.data || response.data;
  },

  /**
   * Check AI health
   * GET /api/predict/health
   */
  checkHealth: async () => {
    const response = await api.get("/predict/health");
    return response.data;
  },
};
