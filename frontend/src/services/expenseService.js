import api from './api';

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

export const getExpenses = async (filters = {}) => {
  const query = buildQueryString(filters);
  const response = await api.get(`/expenses${query}`);
  return response.data;
};

export const getExpenseById = async (id) => {
  const response = await api.get(`/expenses/${id}`);
  return response.data;
};

export const createExpense = async (expenseData) => {
  const response = await api.post('/expenses', expenseData);
  return response.data;
};

export const updateExpense = async (id, expenseData) => {
  const response = await api.put(`/expenses/${id}`, expenseData);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

export const bulkUploadExpenses = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/expenses/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadTemplate = async () => {
  const response = await api.get('/expenses/template', {
    responseType: 'blob',
  });
  return response.data;
};

export const exportExpenses = async (filters = {}) => {
  const query = buildQueryString(filters);
  const response = await api.get(`/expenses/export${query}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getExpenseStats = async () => {
  const response = await api.get('/expenses/stats');
  return response.data;
};
