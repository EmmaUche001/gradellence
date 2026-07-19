import { Navigate, Outlet } from 'react-router-dom';

export default function ParentRoute() {
  const token = localStorage.getItem('parent_token');
  return token ? <Outlet /> : <Navigate to="/parent/login" replace />;
}
