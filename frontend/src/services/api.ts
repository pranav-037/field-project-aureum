import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User API
export const userApi = {
  getAll: () => api.get('/users'),
  create: (data: { email: string; name: string; role?: string }) =>
    api.post('/users', data),
};

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/login', data),
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
    buyerAddress?: string;
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

export default api;