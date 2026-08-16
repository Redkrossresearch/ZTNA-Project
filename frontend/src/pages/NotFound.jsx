import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

const NotFound = () => (
  <AuthLayout title="404 - Page not found" subtitle="The page you're looking for doesn't exist.">
    <p className="auth-footer">
      <Link to="/dashboard">Back to dashboard</Link>
    </p>
  </AuthLayout>
);

export default NotFound;
