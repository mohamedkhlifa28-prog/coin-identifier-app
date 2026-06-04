import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('coinvault_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('coinvault_token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),
  register: (email, password, name) =>
    apiClient.post('/auth/register', { email, password, name }),
}

// User API
export const userAPI = {
  getProfile: () => apiClient.get('/user/profile'),
  getStats: () => apiClient.get('/user/stats'),
  updateProfile: (data) => apiClient.put('/user/profile', data),
  getNotifications: () => apiClient.get('/user/notifications'),
  getBadges: () => apiClient.get('/user/badges'),
}

// Scan API
export const scanAPI = {
  scanCoin: (imageBase64, mimeType = 'image/jpeg') =>
    apiClient.post('/scan', { imageBase64, mimeType }),
  gradeCoin: (obverseBase64, reverseBase64, mimeType = 'image/jpeg') =>
    apiClient.post('/scan/grade', { obverseBase64, reverseBase64, mimeType }),
  detectErrors: (imageBase64, mimeType = 'image/jpeg') =>
    apiClient.post('/scan/error-detect', { imageBase64, mimeType }),
}

// Collection API
export const collectionAPI = {
  getCollection: (params) => apiClient.get('/collection', { params }),
  addCoin: (coinData) => apiClient.post('/collection', coinData),
  getCoin: (id) => apiClient.get(`/collection/${id}`),
  updateCoin: (id, data) => apiClient.put(`/collection/${id}`, data),
  deleteCoin: (id) => apiClient.delete(`/collection/${id}`),
  getStats: () => apiClient.get('/collection/stats'),
}

// Marketplace API
export const marketplaceAPI = {
  getListings: (params) => apiClient.get('/marketplace', { params }),
  createListing: (data) => apiClient.post('/marketplace', data),
  getListing: (id) => apiClient.get(`/marketplace/${id}`),
  makeOffer: (id, offerData) =>
    apiClient.post(`/marketplace/${id}/offer`, offerData),
  updateOffer: (id, offerId, status) =>
    apiClient.put(`/marketplace/${id}/offer/${offerId}`, { status }),
  toggleWatchlist: (id) =>
    apiClient.post(`/marketplace/${id}/watch`),
  getWatchlist: () => apiClient.get('/marketplace/watchlist'),
}

// Feed API
export const feedAPI = {
  getFeed: (params) => apiClient.get('/feed', { params }),
  createPost: (data) => apiClient.post('/feed', data),
  likePost: (id) => apiClient.post(`/feed/${id}/like`),
  getPost: (id) => apiClient.get(`/feed/${id}`),
  addComment: (id, content) =>
    apiClient.post(`/feed/${id}/comment`, { content }),
  getTrending: () => apiClient.get('/feed/trending'),
}

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: (params) => apiClient.get('/leaderboard', { params }),
}

// Subscribe API
export const subscribeAPI = {
  subscribe: (tier) => apiClient.post('/subscribe', { tier }),
  getStatus: () => apiClient.get('/subscribe/status'),
  cancel: () => apiClient.post('/subscribe/cancel'),
}

// Prices API
export const pricesAPI = {
  getPrice: (coinId) => apiClient.get(`/prices/${coinId}`),
  getSilverSpot: () => apiClient.get('/prices/silver-spot'),
}

export default apiClient
