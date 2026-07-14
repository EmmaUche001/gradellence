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

export const parentAuth = {
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string; schoolSlug: string; admissionNumber: string }) =>
    parentApi.post('/parents/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    parentApi.post('/parents/login', data).then((r) => r.data),
};

export const parentDashboard = {
  getStudents: () => parentApi.get('/parents/students').then((r) => r.data),

  getStudentResults: (studentId: string) =>
    parentApi.get(`/parents/students/${studentId}/results`).then((r) => r.data),

  getStudentAnalytics: (studentId: string) =>
    parentApi.get(`/parents/students/${studentId}/analytics`).then((r) => r.data),
};

export default parentApi;