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
  }
};

export default authService;
