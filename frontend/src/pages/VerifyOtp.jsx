import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Alert from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errorHandling';

const VerifyOtp = () => {
  const { verifyLoginOtp, resendLoginOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mfaToken, setMfaToken] = useState(location.state?.mfaToken || '');
  const mfaChannel = location.state?.mfaChannel;
  const initialMessage = location.state?.message;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(initialMessage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Guard: this page only makes sense mid-login, with a real mfaToken.
  if (!location.state?.mfaToken) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to you.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyLoginOtp({ mfaToken, otp });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setIsResending(true);
    try {
      const { data } = await resendLoginOtp({ mfaToken });
      setMfaToken(data.data.mfaToken);
      setInfo(data.message || 'A new code has been sent.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your identity"
      subtitle={
        mfaChannel
          ? `Enter the 6-digit code sent via ${mfaChannel === 'sms' ? 'SMS' : 'email'}`
          : 'Enter the 6-digit verification code'
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Alert type="error">{error}</Alert>
        <Alert type="success">{info}</Alert>

        <div className="form-group">
          <label htmlFor="otp">Verification code</label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            className={`otp-input ${error ? 'has-error' : ''}`}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting || otp.length !== 6}>
          {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
        </button>
      </form>

      <p className="auth-footer">
        Didn&apos;t get a code?{' '}
        <button type="button" className="btn-link" onClick={handleResend} disabled={isResending}>
          {isResending ? 'Sending...' : 'Resend code'}
        </button>
      </p>
    </AuthLayout>
  );
};

export default VerifyOtp;
