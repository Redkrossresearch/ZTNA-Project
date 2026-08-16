import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errorHandling';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email address';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await login({ email: form.email.trim().toLowerCase(), password: form.password });

      if (result.mfaRequired) {
        navigate('/verify-otp', {
          state: { mfaToken: result.mfaToken, mfaChannel: result.mfaChannel, message: result.message },
        });
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Account-locked (423) and attemptsRemaining (401) responses both
      // flow through here — getErrorMessage surfaces the backend's exact message.
      setServerError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your ZTNA account">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Alert type="error">{serverError}</Alert>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={errors.email ? 'has-error' : ''}
            value={form.email}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={errors.password ? 'has-error' : ''}
            value={form.password}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div style={{ textAlign: 'right' }}>
          <Link to="/forgot-password" className="btn-link" style={{ textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="auth-footer">
        Don&apos;t have an account? <Link to="/register">Create one</Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
