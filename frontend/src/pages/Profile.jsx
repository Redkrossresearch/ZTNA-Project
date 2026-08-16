import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/authApi';
import Alert from '../components/Alert';
import { useToast } from '../components/ToastContext';
import { getErrorMessage } from '../utils/errorHandling';
import '../components/layout.css';
import '../pages/auth.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const Profile = () => {
  const { user, refreshMe } = useAuth();
  const { showToast } = useToast();

  // ---- Phone verification state ----
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneStep, setPhoneStep] = useState('idle'); // idle -> otp_sent
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);

  // ---- MFA method state ----
  const [mfaMethod, setMfaMethod] = useState(user?.mfaMethod || 'email');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [isMfaSubmitting, setIsMfaSubmitting] = useState(false);

  const handleRequestPhoneOtp = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneSuccess('');

    if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
      setPhoneError('Enter a valid phone number in E.164 format (e.g. +14155552671).');
      return;
    }

    setIsPhoneSubmitting(true);
    try {
      const { data } = await authApi.requestPhoneVerification({ phone });
      setPhoneSuccess(data.message);
      setPhoneStep('otp_sent');
    } catch (err) {
      setPhoneError(getErrorMessage(err));
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const handleConfirmPhoneOtp = async (e) => {
    e.preventDefault();
    setPhoneError('');

    if (!/^\d{6}$/.test(phoneOtp)) {
      setPhoneError('Enter the 6-digit code sent via SMS.');
      return;
    }

    setIsPhoneSubmitting(true);
    try {
      const { data } = await authApi.confirmPhoneVerification({ otp: phoneOtp });
      setPhoneSuccess(data.message);
      setPhoneStep('idle');
      setPhoneOtp('');
      showToast('Phone number verified');
      await refreshMe();
    } catch (err) {
      setPhoneError(getErrorMessage(err));
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const handleMfaMethodChange = async (method) => {
    setMfaError('');
    setMfaSuccess('');
    setMfaMethod(method);

    setIsMfaSubmitting(true);
    try {
      const { data } = await authApi.setMfaMethod({ method });
      setMfaSuccess(data.message);
      showToast(`MFA method set to ${method.toUpperCase()}`);
      await refreshMe();
    } catch (err) {
      setMfaError(getErrorMessage(err));
      setMfaMethod(user?.mfaMethod || 'email'); // revert UI on failure
    } finally {
      setIsMfaSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>View your account details and manage multi-factor authentication.</p>
      </div>

      <div className="profile-grid">
        {/* ---------- Account info (read-only, no edit endpoint exists) ---------- */}
        <div className="panel">
          <h3 className="panel-title">Account Information</h3>
          <div className="info-row">
            <span>Name</span>
            <span>{user?.name}</span>
          </div>
          <div className="info-row">
            <span>Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="info-row">
            <span>Phone</span>
            <span>{user?.phone || 'Not set'}</span>
          </div>
          <div className="info-row">
            <span>Role</span>
            <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
          <div className="info-row">
            <span>Status</span>
            <span style={{ textTransform: 'capitalize' }}>{user?.status}</span>
          </div>
          <div className="info-row">
            <span>Last login</span>
            <span>{formatDate(user?.lastLoginAt)}</span>
          </div>
          <div className="info-row">
            <span>Last login country</span>
            <span>{user?.lastLoginCountry || '—'}</span>
          </div>
          <div className="info-row">
            <span>Member since</span>
            <span>{formatDate(user?.createdAt)}</span>
          </div>
        </div>

        {/* ---------- MFA method ---------- */}
        <div className="panel">
          <h3 className="panel-title">Multi-Factor Authentication</h3>
          <Alert type="error">{mfaError}</Alert>
          <Alert type="success">{mfaSuccess}</Alert>

          <div className="form-group">
            <label htmlFor="mfaMethod">Preferred verification method</label>
            <select
              id="mfaMethod"
              value={mfaMethod}
              onChange={(e) => handleMfaMethodChange(e.target.value)}
              disabled={isMfaSubmitting}
            >
              <option value="email">Email</option>
              <option value="sms" disabled={!user?.phoneVerified}>
                SMS {user?.phoneVerified ? '' : '(verify a phone number first)'}
              </option>
            </select>
          </div>

          <p className="field-hint">
            Phone verification: {user?.phoneVerified ? '✓ Verified' : '✗ Not verified'}
          </p>
        </div>
      </div>

      {/* ---------- Phone verification ---------- */}
      <div className="panel">
        <h3 className="panel-title">Phone Verification</h3>
        <p style={{ fontSize: 13, color: '#5b6b82', marginBottom: 16 }}>
          Verifying a phone number lets you use SMS as your MFA method.
        </p>

        <Alert type="error">{phoneError}</Alert>
        <Alert type="success">{phoneSuccess}</Alert>

        {phoneStep === 'idle' && (
          <form className="auth-form" onSubmit={handleRequestPhoneOtp} style={{ maxWidth: 340 }}>
            <div className="form-group">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                placeholder="+14155552671"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isPhoneSubmitting}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isPhoneSubmitting} style={{ width: 200 }}>
              {isPhoneSubmitting ? 'Sending...' : 'Send verification code'}
            </button>
          </form>
        )}

        {phoneStep === 'otp_sent' && (
          <form className="auth-form" onSubmit={handleConfirmPhoneOtp} style={{ maxWidth: 340 }}>
            <div className="form-group">
              <label htmlFor="phoneOtp">Verification code</label>
              <input
                id="phoneOtp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="otp-input"
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isPhoneSubmitting}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPhoneSubmitting || phoneOtp.length !== 6}
              style={{ width: 200 }}
            >
              {isPhoneSubmitting ? 'Verifying...' : 'Confirm code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
