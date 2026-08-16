import React from 'react';
import '../pages/auth.css';

const AuthLayout = ({ title, subtitle, children }) => (
  <div className="auth-page">
    <div className="auth-card">
      <div className="auth-brand">
        <h1>
          ZTNA<span>Secure</span>
        </h1>
      </div>
      <h2 className="auth-title">{title}</h2>
      {subtitle && <p className="auth-subtitle">{subtitle}</p>}
      {children}
    </div>
  </div>
);

export default AuthLayout;
