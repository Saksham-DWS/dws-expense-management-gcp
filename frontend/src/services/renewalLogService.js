import api from './api';

export const getRenewalLogs = async (entryId) => {
  const response = await api.get(`/service-handler/logs/${entryId}`);
  return response.data;
};

export default {
  getRenewalLogs,
};
