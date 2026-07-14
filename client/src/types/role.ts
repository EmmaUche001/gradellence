export interface Role {
  id: string;
  name: string;
  description?: string;
  isGlobal: boolean;
  schoolId?: string;
  permissions: Permission[];
  _count?: {
    users: number;
  };
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface UserRoles {
  roleIds: string[];
}