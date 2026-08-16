import axiosClient from './axiosClient';

/**
 * Maps 1:1 to backend routes/authRoutes.js. Every function here corresponds
 * to a real, verified endpoint from Phase 1's backend analysis — nothing
 * invented (no /refresh-token, since it doesn't exist on the backend).
 */
const authApi = {
  register: ({ name, email, password, phone }) =>
    axiosClient.post('/auth/register', { name, email, password, phone }),

  login: ({ email, password }) => axiosClient.post('/auth/login', { email, password }),

  verifyLoginOtp: ({ mfaToken, otp }) => axiosClient.post('/auth/verify-otp', { mfaToken, otp }),

  resendLoginOtp: ({ mfaToken }) => axiosClient.post('/auth/resend-otp', { mfaToken }),

  forgotPassword: ({ email }) => axiosClient.post('/auth/forgot-password', { email }),

  verifyResetOtp: ({ resetToken, otp }) =>
    axiosClient.post('/auth/verify-reset-otp', { resetToken, otp }),

  resetPassword: ({ resetToken, newPassword }) =>
    axiosClient.post('/auth/reset-password', { resetToken, newPassword }),

  logout: () => axiosClient.post('/auth/logout'),

  getMe: () => axiosClient.get('/auth/me'),

  requestPhoneVerification: ({ phone }) =>
    axiosClient.post('/auth/mfa/phone/request-otp', { phone }),

  confirmPhoneVerification: ({ otp }) =>
    axiosClient.post('/auth/mfa/phone/confirm-otp', { otp }),

  setMfaMethod: ({ method }) => axiosClient.patch('/auth/mfa/method', { method }),
};

export default authApi;
