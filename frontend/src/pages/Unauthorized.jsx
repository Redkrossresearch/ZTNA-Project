import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

const Unauthorized = () => (
  <AuthLayout title="Access denied" subtitle="You don't have permission to view this page.">
    <p className="auth-footer">
      <Link to="/dashboard">Back to dashboard</Link>
    </p>
  </AuthLayout>
);

export default Unauthorized;
