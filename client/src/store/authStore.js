import { create } from 'zustand'
import api from '../services/api.js'

export const ROLES = {
  SLP: 'SLP',
  ADMIN: 'ADMIN',
  PARENT: 'PARENT',
  SCHOOL_COORDINATOR: 'SCHOOL_COORDINATOR',
}

const savedUser = localStorage.getItem('speechsync_user');
const savedToken = localStorage.getItem('speechsync_token');

const useAuthStore = create((set) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  isAuthenticated: !!savedToken,
  
  login: async (email, password) => {
    try {
      const response = await api.auth.login(email, password);
      localStorage.setItem('speechsync_token', response.token);
      localStorage.setItem('speechsync_user', JSON.stringify(response.user));
      set({ user: response.user, isAuthenticated: true });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('speechsync_token');
    localStorage.removeItem('speechsync_user');
    set({ user: null, isAuthenticated: false });
  },
}))

export default useAuthStore
