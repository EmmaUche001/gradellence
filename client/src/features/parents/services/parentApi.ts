import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const parentApi = axios.create({
  baseURL: API_BASE,
});

parentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('parent_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 response interceptor — silent token refresh (REQ 7.2–7.6)
parentApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // REQ 7.6 — never retry the refresh endpoint itself to avoid infinite loops
    if (originalRequest.url?.includes('/parents/refresh')) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('parent_refresh_token');

    if (!refreshToken) {
      // REQ 7.5 — no refresh token available, clear storage and redirect
      localStorage.removeItem('parent_token');
      localStorage.removeItem('parent_refresh_token');
      window.location.href = '/parent/login';
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // REQ 7.3 — call the refresh endpoint
      const { data } = await parentApi.post('/parents/refresh', { refreshToken });

      // REQ 7.4 — store new tokens
      localStorage.setItem('parent_token', data.accessToken);
      localStorage.setItem('parent_refresh_token', data.refreshToken);

      // Retry the original request with the new access token
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return parentApi(originalRequest);
    } catch {
      // REQ 7.5 — refresh failed, clear storage and redirect
      localStorage.removeItem('parent_token');
      localStorage.removeItem('parent_refresh_token');
      window.location.href = '/parent/login';
      return Promise.reject(error);
    }
  },
);

export const parentAuth = {
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    schoolSlug: string;
    admissionNumber: string;
  }) => parentApi.post('/parents/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    parentApi.post('/parents/login', data).then((r) => {
      const { accessToken, refreshToken } = r.data;
      // REQ 7.1 — store both tokens on successful login
      if (accessToken) {
        localStorage.setItem('parent_token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('parent_refresh_token', refreshToken);
      }
      return r.data;
    }),
};

export const parentDashboard = {
  getStudents: () => parentApi.get('/parents/students').then((r) => r.data),

  getStudentResults: (studentId: string) =>
    parentApi.get(`/parents/students/${studentId}/results`).then((r) => r.data),

  getStudentAnalytics: (studentId: string) =>
    parentApi.get(`/parents/students/${studentId}/analytics`).then((r) => r.data),

  downloadReportCard: (studentId: string, termId: string) =>
    parentApi.get(`/parents/students/${studentId}/report-card/${termId}`, {
      responseType: 'blob',
    }),

  downloadTranscript: (studentId: string) =>
    parentApi.get(`/parents/students/${studentId}/transcript`, {
      responseType: 'blob',
    }),

  downloadAcademicSummary: (studentId: string) =>
    parentApi.get(`/parents/students/${studentId}/academic-summary`, {
      responseType: 'blob',
    }),
};

export default parentApi;
