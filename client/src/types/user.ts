export interface User {
  id: string;
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles?: { roleId: string; role?: { id: string; name: string; description?: string } }[];
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleIds?: string[];
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  roleIds?: string[];
}