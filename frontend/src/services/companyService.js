import api from './api';

export const getCompanyById = async (companyId) => {
  if (!companyId) return null;
  const resp = await api.get(`/companies/${companyId}`);
  return resp.data;
};

export default { getCompanyById };
