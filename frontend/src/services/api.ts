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
  create: (data: {
    title: string;
    artist: string;
    year?: string;
    medium?: string;
    dimensions?: string;
    ownerId: string;
  }) => api.post('/artworks', data),
};

// Health check
export const healthApi = {
  check: () => axios.get('/health'),
};

export default api;