import api from './api';

export const login = async (email, password, role) => {
  const response = await api.post('/auth/login', { email, password, role });
  if (response.data.success) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.data));
  }
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getBootstrapStatus = async () => {
  const response = await api.get('/auth/bootstrap-status');
  return response.data;
};

export const bootstrapSuperAdmin = async (payload) => {
  const response = await api.post('/auth/bootstrap-super-admin', payload);
  return response.data;
};

// Alias for first-time Super Admin signup (mirrors bootstrap endpoint)
export const superAdminSignup = async (payload) => {
  const response = await api.post('/auth/super-admin-signup', payload);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateMe = async (payload) => {
  const response = await api.put('/auth/me', payload);
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/auth/users');
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/auth/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/auth/users/${id}`);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
