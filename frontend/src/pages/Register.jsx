import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { validatePasswordPolicy } from '../utils/passwordPolicy';
import { getErrorMessage, getFieldErrors } from '../utils/errorHandling';

const PASSWORD_RULES = [
  { key: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'num', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]/~`;']/.test(p) },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = 'Name must be at least 2 characters';
    }
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email address';

    const policy = validatePasswordPolicy(form.password);
    if (!policy.valid) next.password = 'Password does not meet all requirements below';

    if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Passwords do not match';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });

      setSuccessMessage('Account created successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setServerError(getErrorMessage(err));
      setErrors((prev) => ({ ...prev, ...getFieldErrors(err) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Register for secure Zero Trust access">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Alert type="error">{serverError}</Alert>
        <Alert type="success">{successMessage}</Alert>

        <div className="form-group">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className={errors.name ? 'has-error' : ''}
            value={form.name}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

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
          <label htmlFor="phone">Phone (optional)</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+14155552671"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <span className="field-hint">Used later for SMS-based MFA, if enabled.</span>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={errors.password ? 'has-error' : ''}
            value={form.password}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <ul className="password-checklist">
            {PASSWORD_RULES.map((rule) => (
              <li key={rule.key} className={rule.test(form.password) ? 'met' : ''}>
                {rule.test(form.password) ? '✓' : '✗'} {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={errors.confirmPassword ? 'has-error' : ''}
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
