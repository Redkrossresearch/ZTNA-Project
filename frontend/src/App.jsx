import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import AppLayout from './components/AppLayout';

// ---- Phase 3: real authentication pages ----
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyOtp from './pages/VerifyOtp';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

/**
 * Phase 7 performance pass: everything behind the authenticated shell is
 * code-split with React.lazy so the initial bundle only has to include the
 * auth pages a signed-out visitor actually needs. Auth pages stay as
 * regular imports since they're on the critical path for every visitor.
 */
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));

// NOTE: there is no "AdminSessions" page — the backend has no endpoint to
// list sessions across all users (only GET /sessions for one's own, and
// DELETE /sessions/:id to revoke by ID). Building that page would mean
// faking data, which is explicitly disallowed. Session-derived aggregate
// data (risk distribution) is shown for real on AdminDashboard instead.
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminIncidents = lazy(() => import('./pages/admin/AdminIncidents'));
const AdminAccessLogs = lazy(() => import('./pages/admin/AdminAccessLogs'));
const AdminThreatIntel = lazy(() => import('./pages/admin/AdminThreatIntel'));

const MySessions = lazy(() => import('./pages/security/MySessions'));
const MyAccessLogs = lazy(() => import('./pages/security/MyAccessLogs'));
const MySecurityAlerts = lazy(() => import('./pages/security/MySecurityAlerts'));

const PageLoadingFallback = () => (
  <div style={{ padding: 40 }} role="status" aria-live="polite">
    <p style={{ color: '#5b6b82', fontSize: 14 }}>Loading...</p>
  </div>
);

/**
 * Redirects an already-authenticated user away from public-only auth pages
 * (e.g. visiting /login while already logged in).
 */
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const { isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }} role="status" aria-live="polite">
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* ---------- Public routes ---------- */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ---------- Protected routes (any authenticated user) ---------- */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/sessions" element={<MySessions />} />
            <Route path="/access-logs" element={<MyAccessLogs />} />
            <Route path="/security-alerts" element={<MySecurityAlerts />} />

            {/* ---------- Admin-only routes ---------- */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/incidents" element={<AdminIncidents />} />
              <Route path="/admin/access-logs" element={<AdminAccessLogs />} />
              <Route path="/admin/threat-intel" element={<AdminThreatIntel />} />
            </Route>
          </Route>
        </Route>

        {/* ---------- Fallbacks ---------- */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
