import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards admin-only route trees (dashboard, user management, incidents,
 * threat intel) — mirrors the backend's authorize('admin') middleware.
 * Must be nested inside <ProtectedRoute /> so isAuthenticated is already true.
 */
const AdminRoute = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
