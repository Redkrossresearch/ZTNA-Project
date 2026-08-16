import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards any route tree requiring a logged-in user.
 * Waits for the initial /auth/me hydration before deciding, so a hard
 * refresh doesn't briefly flash a redirect to /login for a valid session.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return null; // App-level loading UI handles this; avoid a redirect flash
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
