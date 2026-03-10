import api from './api';

/* ── sequences ─────────────────────────────────────── */
export const getSequences   = (params = {}) => api.get('/sequences', { params }).then(r => r.data);
export const getSequence    = (id)          => api.get(`/sequences/${id}`).then(r => r.data);
export const createSequence = (data)        => api.post('/sequences', data).then(r => r.data);
export const updateSequence = (id, data)    => api.put(`/sequences/${id}`, data).then(r => r.data);
export const deleteSequence = (id)          => api.delete(`/sequences/${id}`).then(r => r.data);

/* ── enrollments ───────────────────────────────────── */
export const enrollContacts   = (seqId, contactIds)       => api.post(`/sequences/${seqId}/enroll`, { contactIds }).then(r => r.data);
export const getEnrollments   = (seqId, params = {})      => api.get(`/sequences/${seqId}/enrollments`, { params }).then(r => r.data);
export const cancelEnrollment = (seqId, enrollmentId)     => api.delete(`/sequences/${seqId}/enrollments/${enrollmentId}`).then(r => r.data);
export const pauseEnrollment  = (seqId, enrollmentId, reason) => api.post(`/sequences/${seqId}/enrollments/${enrollmentId}/pause`, { reason }).then(r => r.data);
export const resumeEnrollment = (seqId, enrollmentId)     => api.post(`/sequences/${seqId}/enrollments/${enrollmentId}/resume`).then(r => r.data);

/* ── contact-level ─────────────────────────────────── */
export const getContactEnrollments = (contactId) => api.get(`/sequences/contact/${contactId}/enrollments`).then(r => r.data);
