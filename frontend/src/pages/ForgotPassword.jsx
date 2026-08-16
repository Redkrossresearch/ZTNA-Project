import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Alert from '../components/Alert';
import authApi from '../api/authApi';
import { getErrorMessage } from '../utils/errorHandling';

/**
 * Backend always returns a generic "if an account exists..." message
 * regardless of whether the email is registered (no enumeration). The
 * resetToken it returns alongside that message is what carries the user
 * into the OTP + new-password steps on the ResetPassword page.
 */
const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await authApi.forgotPassword({ email: email.trim().toLowerCase() });

      if (data.data?.resetToken) {
        navigate('/reset-password', { state: { resetToken: data.data.resetToken, email, message: data.message } });
      } else {
        // Email didn't exist — backend intentionally omits resetToken.
        // We can't proceed to OTP entry, so we just show the generic message here.
        setError(data.message);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll send a verification code to your email">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Alert type="error">{error}</Alert>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send verification code'}
        </button>
      </form>

      <p className="auth-footer">
        Remembered it? <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
