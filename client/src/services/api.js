import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = {
  // Start a new recording session
  startSession: async (userId, metadata = {}) => {
    try {
      const response = await axios.post(`${API_URL}/sessions/start`, {
        userId,
        metadata,
      });
      return response.data;
    } catch (error) {
      console.error("Error starting session:", error);
      throw error;
    }
  },

  // Save recorded events in batch
  saveEvents: async (sessionId, events) => {
    try {
      const response = await axios.post(
        `${API_URL}/sessions/${sessionId}/events`,
        {
          events,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error saving events:", error);
      throw error;
    }
  },

  // End a recording session
  endSession: async (sessionId) => {
    try {
      const response = await axios.post(`${API_URL}/sessions/${sessionId}/end`);
      return response.data;
    } catch (error) {
      console.error("Error ending session:", error);
      throw error;
    }
  },

  // Get a specific session with events
  getSession: async (sessionId) => {
    try {
      const response = await axios.get(`${API_URL}/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error("Error getting session:", error);
      throw error;
    }
  },

  // Get all sessions for a user (without events data)
  getUserSessions: async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}/sessions`);
      return response.data;
    } catch (error) {
      console.error("Error getting user sessions:", error);
      throw error;
    }
  },
};

export default api;
