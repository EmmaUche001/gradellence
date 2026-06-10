import apiClient from './apiClient';

const api = apiClient;

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  schoolName: string;
  schoolAlias: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    schoolId: string;
    roles: string[];
  };
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/v1/auth/login', credentials);
    return response.data.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/v1/auth/register', data);
    return response.data.data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await api.post('/v1/auth/refresh', { refreshToken });
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/v1/auth/logout');
  },
};