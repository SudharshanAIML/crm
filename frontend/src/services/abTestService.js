import api from './api';

/* ── A/B tests CRUD ────────────────────────────────── */
export const getTests    = (params = {}) => api.get('/ab-tests', { params }).then(r => r.data);
export const getTest     = (id)          => api.get(`/ab-tests/${id}`).then(r => r.data);
export const createTest  = (data)        => api.post('/ab-tests', data).then(r => r.data);
export const updateTest  = (id, data)    => api.put(`/ab-tests/${id}`, data).then(r => r.data);
export const deleteTest  = (id)          => api.delete(`/ab-tests/${id}`).then(r => r.data);

/* ── send & results ────────────────────────────────── */
export const sendTest    = (id, contactIds) => api.post(`/ab-tests/${id}/send`, { contactIds }).then(r => r.data);
export const getResults  = (id)             => api.get(`/ab-tests/${id}/results`).then(r => r.data);
