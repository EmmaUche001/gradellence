import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const SuperAdminGuard: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.roles?.includes('SUPER_ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default SuperAdminGuard;