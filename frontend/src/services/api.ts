import axios from 'axios';
import { invalidateStoredAuth } from '../utils/authEvents';
import { validateAuthSession } from '../utils/tokenValidator';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Only send a locally cached token when its structure and profile still validate.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aureum_token') || localStorage.getItem('token');
  if (!token) return config;

  const storedUser = localStorage.getItem('aureum_user') || localStorage.getItem('user');
  if (!storedUser) {
    invalidateStoredAuth();
    return config;
  }

  let userData: unknown;
  try {
    userData = JSON.parse(storedUser) as unknown;
  } catch {
    invalidateStoredAuth();
    return config;
  }

  const validation = validateAuthSession(token, userData);
  if (!validation.success) {
    invalidateStoredAuth();
    return config;
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.headers?.Authorization
    ) {
      invalidateStoredAuth();
    }
    return Promise.reject(error);
  }
);

// User API
export const userApi = {
  getAll: () => api.get('/users'),
  create: (data: { email: string; name: string; password: string; role?: string }) =>
    api.post('/users', data),
  updateProfile: (data: any) =>
    api.put('/users/profile', data),
};

// Institution API
export const institutionApi = {
  getAll: () => api.get('/institutions'),
  approve: (walletAddress: string) => api.post('/institutions/approve', { walletAddress }),
};

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: {
    email: string;
    password?: string;
    name?: string;
    fullName?: string;
    role?: string;
    userType?: string;
    walletAddress?: string;
  }) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  googleLogin: (data: { idToken: string; role?: string }) => api.post('/auth/google', data),
};

// Activity History API
export const activityApi = {
  getAll: (params?: { userId?: string; limit?: number }) => api.get('/activities', { params }),
  create: (data: {
    userId?: string;
    userEmail?: string;
    type: string;
    title: string;
    detail?: string;
    badge?: string;
    txHash?: string;
  }) => api.post('/activities', data),
};

// Artwork API
export const artworkApi = {
  getAll: () => api.get('/artworks'),
  getById: (id: string) => api.get(`/artworks/${id}`),
  getTransfers: (artworkId: string) => api.get(`/artworks/${artworkId}/transfers`),
  getProvenance: (id: string) => api.get(`/artworks/${id}/provenance`),
  verifyCid: (id: string) => api.get(`/artworks/${id}/verify-cid`),
  create: (data: {
    title: string;
    artist: string;
    year?: string;
    medium?: string;
    dimensions?: string;
    edition?: string;
    authenticationMethod?: string;
    metadataCid?: string;
    imageCids?: string[];
    documentCids?: string[];
    bindingReference?: string;
    ownerId: string;
    ownerAddress?: string;
  }) => api.post('/artworks', data),
};

// Transfer API
export const transferApi = {
  getAll: () => api.get('/transfers'),
  create: (data: {
    artworkId: string;
    sellerId: string;
    buyerId?: string;
    buyerAddress: string;
    transferDate?: string;
    priceVisibility?: string;
    priceCommitment?: string;
    supportingDocCids?: string[];
  }) => api.post('/transfers', data),
  accept: (transferId: string) => api.post(`/transfers/${transferId}/accept`),
  cancel: (transferId: string, reason?: string) =>
    api.post(`/transfers/${transferId}/cancel`, { reason }),
};

// IPFS API
export const ipfsApi = {
  getStatus: () => api.get('/ipfs/status'),
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ipfs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/ipfs/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  pinJSON: (metadata: Record<string, any>, name?: string) =>
    api.post('/ipfs/pin-json', { metadata, name }),
  getContentUrl: (cid: string) => `/api/ipfs/${cid}`,
};

// Blockchain API
export const blockchainApi = {
  getStatus: () => api.get('/blockchain/status'),
  approveInstitution: (walletAddress: string) =>
    api.post('/institutions/approve', { walletAddress }),
};

// Health check
export const healthApi = {
  check: () => axios.get('/health'),
};

// Helper to extract exact reason from errors
export function formatAuthError(err: any, fallbackMessage: string): string {
  if (err?.response?.data?.error && typeof err.response.data.error === 'string') {
    return err.response.data.error;
  }
  if (err?.response?.data?.message && typeof err.response.data.message === 'string') {
    return err.response.data.message;
  }
  if (typeof err?.response?.data === 'string' && err.response.data.trim().length > 0) {
    return err.response.data;
  }

  // HTTP status specific errors
  if (err?.response?.status === 400) {
    return 'Invalid details provided. Please review the form fields.';
  }
  if (err?.response?.status === 401) {
    return 'Authentication failed. Please verify your email and password.';
  }
  if (err?.response?.status === 404) {
    return 'Authentication endpoint not found (404). Please verify that the backend is running.';
  }
  if (err?.response?.status === 409) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (err?.response?.status === 500) {
    return 'Server error (500). Please check backend logs or try again shortly.';
  }

  // Network & connection errors
  if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
    return 'Cannot connect to authentication server. Please check your internet connection or verify the service is running.';
  }
  if (err?.code === 'ECONNABORTED' || err?.name === 'TimeoutError') {
    return 'Connection to server timed out. Please try again.';
  }

  if (err?.message && typeof err.message === 'string') {
    return err.message;
  }

  return fallbackMessage;
}

export default api;
