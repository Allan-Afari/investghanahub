/**
 * API Utility for InvestGhanaHub Frontend
 * Handles all API calls to the backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { offlineAuth } from './offlineAuth';

// API base URL
const API_BASE_URL = 'http://192.168.8.156:5000/api';

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

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Enable cookies for authentication
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    // Handle specific error codes
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error(message);
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment.');
    } else if ((error.response?.status ?? 0) >= 500) {
      toast.error('Server error. Please try again later.');
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

  invest: async (opportunityId: string, amount: number) => {
    const response = await api.post('/investments/invest', { opportunityId, amount });
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

