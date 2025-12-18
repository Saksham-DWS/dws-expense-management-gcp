import api from './api';

export const getMyServices = async () => {
  const response = await api.get('/service-handler/my-services');
  return response.data;
};

export const respondToRenewal = async (entryId, continueService, reason) => {
  const response = await api.post(
    `/service-handler/renewal-response/${entryId}`,
    {
      continueService,
      reason,
    }
  );
  return response.data;
};

export const requestServiceDisable = async (entryId, subscriptionCancelled, reason) => {
  const response = await api.post(`/service-handler/disable/${entryId}`, {
    subscriptionCancelled,
    reason,
  });
  return response.data;
};
