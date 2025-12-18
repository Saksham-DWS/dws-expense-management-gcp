import api from './api';

export const getNotifications = async (isRead) => {
  const params = isRead !== undefined ? `?isRead=${isRead}` : '';
  const response = await api.get(`/notifications${params}`);
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};
