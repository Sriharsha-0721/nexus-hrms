import api from './api.js';

export const authService = {
  login: async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userData', JSON.stringify(data.user));
      }
      return data;
    } catch (err) {
      throw new Error(err.message || 'Login failed');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
  },

  getCurrentUser: () => {
    const data = localStorage.getItem('userData');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  // Forgot Password
  forgotPassword: async (email) => {
    if (!email) throw new Error('Email is required');
    return await api.post('/auth/forgot-password', { email });
  },

  // Reset Password
  resetPassword: async ({ email, otp, newPassword }) => {
    if (!email || !otp || !newPassword) throw new Error('All fields are required');
    return await api.post('/auth/reset-password', { email, otp, newPassword });
  },

};

export default authService;
