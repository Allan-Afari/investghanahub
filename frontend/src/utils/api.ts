/**
 * API Utility for InvestGhanaHub Frontend
 * Handles all API calls to the backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { offlineAuth } from './offlineAuth';

// API base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5000/api`
    : 'http://localhost:5000/api');

const isOfflineModeEnabled = () => import.meta.env.VITE_OFFLINE_MODE === 'true';

const shouldFallbackToOfflineAuth = (error: unknown) => {
  if (isOfflineModeEnabled()) return true;

  if (!axios.isAxiosError(error)) return false;

  // When the backend is unreachable from a mobile device, Axios usually has no response
  // (e.g. Network Error / timeout). We only fallback on those cases.
  const err = error as AxiosError;
  const isTimeout = err.code === 'ECONNABORTED';
  const hasNoResponse = !err.response;
  return isTimeout || hasNoResponse;
};

// Request queue to handle rate limiting
const requestQueue: Array<() => void> = [];
let isRefreshing = false;

// Create axios instance with custom config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 15000, // Increased timeout
  withCredentials: true, // Enable cookies for authentication
  maxContentLength: 5 * 1024 * 1024, // 5MB
  maxRedirects: 3,
});

// Request queue processor
const processQueue = () => {
  requestQueue.forEach((run) => run());
  requestQueue.length = 0;
};

// Rate limiting configuration
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300; // Minimum time between requests in ms

// Request interceptor for rate limiting and queue management
api.interceptors.request.use(
  async (config) => {
    // Add auth token if exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve =>
        setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }

    lastRequestTime = Date.now();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and rate limiting
api.interceptors.response.use(
  (response) => {
    // Update rate limit headers
    const remaining = response.headers['x-ratelimit-remaining'];
    if (remaining && parseInt(remaining) < 10) {
      console.warn(`API Rate Limit Warning: ${remaining} requests remaining`);
    }
    // Capture deposit reference for manual verification fallback
    try {
      const url = (response.config as any)?.url as string | undefined;
      const data = (response as any)?.data;
      if (
        url && url.includes('/wallet/deposit') &&
        data && data.success && data.data && data.data.reference
      ) {
        localStorage.setItem('lastDepositReference', data.data.reference as string);
      }
    } catch {
      // no-op
    }
    return response;
  },
  async (error: AxiosError) => {
    type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
    const originalRequest = error.config as RetryConfig | undefined;
    if (!originalRequest) return Promise.reject(error);

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle 401 Unauthorized (token expired)
    if (status === 401 && !originalRequest._retry) {
      if ((error.config?.url ?? '').includes('/auth/refresh')) {
        // If refresh token fails, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        // Try to refresh the token
        const response = await api.post('/auth/refresh');
        const { token } = response.data;
        localStorage.setItem('token', token);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle 429 Too Many Requests
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5;

      return new Promise((resolve) => {
        // Add request to queue
        requestQueue.push(() => {
          setTimeout(() => resolve(api(originalRequest)), retryAfter * 1000);
        });

        // Process queue if not already processing
        if (!isRefreshing) {
          isRefreshing = true;
          setTimeout(() => {
            isRefreshing = false;
            processQueue();
          }, retryAfter * 1000);
        }
      });
    }

    // Handle other HTTP errors
    if (status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (status >= 400) {
      const serverMessage =
        typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof (data as Record<string, unknown>).message === 'string'
          ? ((data as Record<string, unknown>).message as string)
          : undefined;
      const errorMessage = serverMessage || 'An error occurred';
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// ===========================================
// AUTH API
// ===========================================

export const authAPI = {
  // Generic register (still works for backward compatibility)
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: 'INVESTOR' | 'BUSINESS_OWNER';
  }) => {
    try {
      const response = await api.post('/auth/register', data);
      return response.data;
    } catch (error: unknown) {
      if (shouldFallbackToOfflineAuth(error)) {
        return offlineAuth.register({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role ?? 'INVESTOR',
        });
      }
      throw error;
    }
  },

  // Dedicated investor registration
  registerInvestor: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    try {
      const response = await api.post('/auth/register/investor', data);
      return response.data;
    } catch (error: unknown) {
      if (shouldFallbackToOfflineAuth(error)) {
        return offlineAuth.register({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: 'INVESTOR',
        });
      }
      throw error;
    }
  },

  // Dedicated business owner registration
  registerBusinessOwner: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    try {
      const response = await api.post('/auth/register/business-owner', data);
      return response.data;
    } catch (error: unknown) {
      if (shouldFallbackToOfflineAuth(error)) {
        return offlineAuth.register({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: 'BUSINESS_OWNER',
        });
      }
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error: unknown) {
      if (shouldFallbackToOfflineAuth(error)) {
        return offlineAuth.login(email, password);
      }
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error: unknown) {
      if (shouldFallbackToOfflineAuth(error)) {
        return offlineAuth.getProfile();
      }
      throw error;
    }
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string }) => {
    try {
      const response = await api.put('/auth/profile', data);
      return response.data;
    } catch (error: unknown) {
      if (shouldFallbackToOfflineAuth(error)) {
        return offlineAuth.updateProfile(data);
      }
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error: unknown) {
      if (shouldFallbackToOfflineAuth(error)) {
        return offlineAuth.changePassword(currentPassword, newPassword);
      }
      throw error;
    }
  },
};

// ===========================================
// KYC API
// ===========================================

export const kycAPI = {
  submit: async (data: {
    ghanaCardNumber: string;
    dateOfBirth: string;
    address: string;
    city: string;
    region: string;
    occupation?: string;
    sourceOfFunds?: string;
  }) => {
    const response = await api.post('/kyc/submit', data);
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/kyc/status');
    return response.data;
  },

  update: async (data: {
    ghanaCardNumber: string;
    dateOfBirth: string;
    address: string;
    city: string;
    region: string;
    occupation?: string;
    sourceOfFunds?: string;
  }) => {
    const response = await api.put('/kyc/update', data);
    return response.data;
  },

  // New KYC Provider endpoints
  initiate: async (data: { ghanaCardNumber: string; firstName: string; lastName: string; dateOfBirth?: string; phoneNumber?: string }) => {
    const response = await api.post('/kyc/initiate', data);
    return response.data;
  },

  checkStatus: async () => {
    const response = await api.get('/kyc/status');
    return response.data;
  },

  // Admin endpoints
  getPending: async () => {
    const response = await api.get('/kyc/pending');
    return response.data;
  },

  approve: async (id: string) => {
    const response = await api.post(`/kyc/${id}/approve`);
    return response.data;
  },

  reject: async (id: string, reason: string) => {
    const response = await api.post(`/kyc/${id}/reject`, { reason });
    return response.data;
  },
};

// ===========================================
// BUSINESS API
// ===========================================

export const businessAPI = {
  list: async (params?: { category?: string; region?: string; page?: number; limit?: number }) => {
    const response = await api.get('/businesses', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/businesses/${id}`);
    return response.data;
  },

  getOpportunities: async (id: string) => {
    const response = await api.get(`/businesses/${id}/opportunities`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description: string;
    category: string;
    location: string;
    region: string;
    registrationNumber?: string;
    targetAmount: number;
  }) => {
    const response = await api.post('/businesses', data);
    return response.data;
  },

  getMyBusinesses: async () => {
    const response = await api.get('/businesses/my/list');
    return response.data;
  },

  getBusinessInfo: async () => {
    const response = await api.get('/businesses/my/info');
    return response.data;
  },

  getMyOpportunities: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/businesses/my/opportunities', { params });
    return response.data;
  },

  update: async (id: string, data: {
    name: string;
    description: string;
    category: string;
    location: string;
    region: string;
    registrationNumber?: string;
    targetAmount: number;
  }) => {
    const response = await api.put(`/businesses/${id}`, data);
    return response.data;
  },

  createOpportunity: async (businessId: string, data: {
    title: string;
    description: string;
    minInvestment: number;
    maxInvestment: number;
    expectedReturn: number;
    duration: number;
    riskLevel: string;
    targetAmount: number;
    startDate: string;
    endDate: string;
  }) => {
    const response = await api.post(`/businesses/${businessId}/opportunities`, data);
    return response.data;
  },

  // Admin endpoints
  getPending: async () => {
    const response = await api.get('/businesses/admin/pending');
    return response.data;
  },

  approve: async (id: string) => {
    const response = await api.post(`/businesses/${id}/approve`);
    return response.data;
  },

  reject: async (id: string, reason: string) => {
    const response = await api.post(`/businesses/${id}/reject`, { reason });
    return response.data;
  },
};

// ===========================================
// INVESTMENT API
// ===========================================

export const investmentAPI = {
  listOpportunities: async (params?: {
    category?: string;
    riskLevel?: string;
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/investments/opportunities', { params });
    return response.data;
  },

  getOpportunityById: async (id: string) => {
    const response = await api.get(`/investments/opportunities/${id}`);
    return response.data;
  },

  // Create a draft agreement for an intended investment
  previewAgreement: async (opportunityId: string, amount: number) => {
    const response = await api.post('/investments/agreements/preview', {
      opportunityId,
      amount,
    });
    return response.data;
  },

  // Accept a previously created draft agreement
  acceptAgreement: async (agreementId: string) => {
    const response = await api.post(`/investments/agreements/${agreementId}/accept`);
    return response.data;
  },

  invest: async (opportunityId: string, amount: number, agreementId: string) => {
    const response = await api.post('/investments/invest', { opportunityId, amount, agreementId });
    return response.data;
  },

  getPortfolio: async () => {
    const response = await api.get('/investments/portfolio');
    return response.data;
  },

  getMyInvestments: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/investments/my-investments', { params });
    return response.data;
  },

  getHistory: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/investments/history', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/investments/${id}`);
    return response.data;
  },

  getTransactions: async (params?: { type?: string; page?: number; limit?: number }) => {
    const response = await api.get('/investments/transactions/list', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/investments/stats/summary');
    return response.data;
  },
};

// ===========================================
// ADMIN API
// ===========================================

export const adminAPI = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  listUsers: async (params?: { role?: string; isActive?: boolean; page?: number; limit?: number }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserDetails: async (id: string) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/admin/users/${id}/status`, { isActive });
    return response.data;
  },

  // KYC Admin endpoints
  getKYCStats: async () => {
    const response = await api.get('/admin/kyc/stats');
    return response.data;
  },

  getPendingKYC: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/admin/kyc/pending', { params });
    return response.data;
  },

  getKYCUsers: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/admin/kyc/users', { params });
    return response.data;
  },

  approveKYC: async (userId: string, riskScore?: number) => {
    const response = await api.post(`/admin/kyc/${userId}/approve`, { riskScore });
    return response.data;
  },

  rejectKYC: async (userId: string, reason?: string) => {
    const response = await api.post(`/admin/kyc/${userId}/reject`, { reason });
    return response.data;
  },

  // Business Admin endpoints
  getPendingBusinesses: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/admin/businesses/pending', { params });
    return response.data;
  },

  approveBusiness: async (businessId: string) => {
    const response = await api.post(`/admin/businesses/${businessId}/approve`);
    return response.data;
  },

  rejectBusiness: async (businessId: string, reason?: string) => {
    const response = await api.post(`/admin/businesses/${businessId}/reject`, { reason });
    return response.data;
  },

  listFraudAlerts: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/admin/fraud-alerts', { params });
    return response.data;
  },

  getFraudAlertDetails: async (id: string) => {
    const response = await api.get(`/admin/fraud-alerts/${id}`);
    return response.data;
  },

  resolveFraudAlert: async (id: string, notes: string, action: 'RESOLVED' | 'DISMISSED') => {
    const response = await api.post(`/admin/fraud-alerts/${id}/resolve`, { notes, action });
    return response.data;
  },

  listAuditLogs: async (params?: {
    userId?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },

  getAuditLogDetails: async (id: string) => {
    const response = await api.get(`/admin/audit-logs/${id}`);
    return response.data;
  },

  getInvestmentReports: async (params?: { startDate?: string; endDate?: string; groupBy?: string }) => {
    const response = await api.get('/admin/reports/investments', { params });
    return response.data;
  },

  getBusinessReports: async () => {
    const response = await api.get('/admin/reports/businesses');
    return response.data;
  },

  createAdmin: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await api.post('/admin/create-admin', data);
    return response.data;
  },
};

export default api;

