import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Alert from '../components/Alert';
import authApi from '../api/authApi';
import { validatePasswordPolicy } from '../utils/passwordPolicy';
import { getErrorMessage } from '../utils/errorHandling';

const PASSWORD_RULES = [
  { key: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'num', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]/~`;']/.test(p) },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [resetToken, setResetToken] = useState(location.state?.resetToken || '');
  const [step, setStep] = useState('otp'); // 'otp' -> 'password' -> 'done'

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard: this page only makes sense after ForgotPassword issued a resetToken.
  if (!location.state?.resetToken) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await authApi.verifyResetOtp({ resetToken, otp });
      setResetToken(data.data.resetToken); // now carries verified: true
      setInfo(data.message);
      setStep('password');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      setError('Password does not meet all requirements below');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await authApi.resetPassword({ resetToken, newPassword });
      setInfo(data.message);
      setStep('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'otp') {
    return (
      <AuthLayout title="Enter verification code" subtitle="Check your email for the 6-digit code">
        <form className="auth-form" onSubmit={handleVerifyOtp} noValidate>
          <Alert type="error">{error}</Alert>
          <Alert type="success">{info}</Alert>

          <div className="form-group">
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting || otp.length !== 6}>
            {isSubmitting ? 'Verifying...' : 'Verify code'}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/forgot-password">Start over</Link>
        </p>
      </AuthLayout>
    );
  }

  if (step === 'password') {
    return (
      <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account">
        <form className="auth-form" onSubmit={handleResetPassword} noValidate>
          <Alert type="error">{error}</Alert>

          <div className="form-group">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            <ul className="password-checklist">
              {PASSWORD_RULES.map((rule) => (
                <li key={rule.key} className={rule.test(newPassword) ? 'met' : ''}>
                  {rule.test(newPassword) ? '✓' : '✗'} {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  // step === 'done'
  return (
    <AuthLayout title="Password reset" subtitle="">
      <Alert type="success">{info || 'Password reset successfully. Redirecting to login...'}</Alert>
    </AuthLayout>
  );
};

export default ResetPassword;
