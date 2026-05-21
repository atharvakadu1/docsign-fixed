// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ds_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('ds_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register:              (d)  => api.post('/auth/register', d),
  login:                 (d)  => api.post('/auth/login', d),
  me:                    ()   => api.get('/auth/me'),
  users:                 ()   => api.get('/auth/users'),

  // WebAuthn
  webauthnRegOptions:    ()   => api.get('/auth/webauthn/register/options'),
  webauthnRegVerify:     (d)  => api.post('/auth/webauthn/register/verify', d),
  webauthnAuthOptions:   ()   => api.get('/auth/webauthn/auth/options'),
  webauthnAuthVerify:    (d)  => api.post('/auth/webauthn/auth/verify', d),
};

// ── Documents ─────────────────────────────────────────────
export const docAPI = {
  upload:   (form, onProgress) => api.post('/documents/upload', form, {
    headers:                { 'Content-Type': 'multipart/form-data' },
    onUploadProgress:       (e) => onProgress?.(Math.round(e.loaded * 100 / e.total)),
  }),
  myDocs:   ()   => api.get('/documents/my'),
  pending:  ()   => api.get('/documents/pending'),
  getOne:   (id) => api.get(`/documents/${id}`),
  audit:    (id) => api.get(`/documents/${id}/audit`),
  delete:   (id) => api.delete(`/documents/${id}`),
  viewUrl:  (id) => `${api.defaults.baseURL}/documents/${id}/view`,
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
};

// ── Signatures ────────────────────────────────────────────
export const sigAPI = {
  sign:   (reqId, d) => api.post(`/signatures/${reqId}/sign`, d),
  reject: (reqId, d) => api.post(`/signatures/${reqId}/reject`, d),
};

// ── Verify (public) ───────────────────────────────────────
export const verifyAPI = {
  verify: (docId) => api.get(`/verify/${docId}`),
};

// ── Blockchain ────────────────────────────────────────────
export const chainAPI = {
  stats:    ()      => api.get('/blockchain/stats'),
  verify:   ()      => api.get('/blockchain/verify'),
  chain:    (page)  => api.get(`/blockchain/chain?page=${page || 1}`),
  docBlocks:(docId) => api.get(`/blockchain/document/${docId}`),
};

// ── Audit ─────────────────────────────────────────────────
export const auditAPI = {
  mine: () => api.get('/audit/me'),
};

export default api;
