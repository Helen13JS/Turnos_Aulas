// src/services/auth.service.js
const API_URL = 'http://localhost:3000/api';

export const authService = {
  async getMe() {
    const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${this.getToken()}` } });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'No se pudo verificar la sesión');
      error.status = response.status;
      throw error;
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },
  async login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  logout() {
    const token = this.getToken();
    if (token) fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    try { return user ? JSON.parse(user) : null; } catch { return null; }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};
