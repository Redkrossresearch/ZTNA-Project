import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authApi from '../api/authApi';
import { setTokens, clearTokens, getAccessToken } from '../utils/tokenStorage';
import { registerUnauthorizedHandler } from '../api/axiosClient';

const AuthContext = createContext(undefined);

/**
 * Wraps the real backend auth flow (Phase 1 analysis):
 *   login() -> either { mfaRequired: true, mfaToken, mfaChannel }
 *              or      { mfaRequired: false, user, accessToken, refreshToken }
 *   verifyOtp() -> completes MFA, returns { user, accessToken, refreshToken }
 *
 * No refresh-token endpoint exists on the backend, so there is no silent
 * refresh here — a 401 (caught globally in axiosClient) logs the user out.
 */
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  // On app load, if a token (or valid httpOnly cookie) exists, hydrate the
  // user from GET /api/auth/me instead of trusting stale localStorage data.
  useEffect(() => {
    const hydrate = async () => {
      try {
        const hasStoredToken = !!getAccessToken();
        // Still attempt /me even without a stored token — the httpOnly
        // cookie set by the backend may be enough on its own.
        const { data } = await authApi.getMe();
        setUser(data.data);
        if (!hasStoredToken) {
          // Cookie-only session; nothing to persist locally beyond user state.
        }
      } catch (err) {
        setUser(null);
        clearTokens();
      } finally {
        setIsInitializing(false);
      }
    };

    hydrate();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });

    if (data.mfaRequired) {
      // Caller (Login page) must route to the OTP screen with this payload.
      return { mfaRequired: true, mfaToken: data.data.mfaToken, mfaChannel: data.mfaChannel, message: data.message };
    }

    setTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
    setUser(data.data.user);
    return { mfaRequired: false, user: data.data.user };
  }, []);

  const verifyLoginOtp = useCallback(async ({ mfaToken, otp }) => {
    const { data } = await authApi.verifyLoginOtp({ mfaToken, otp });
    setTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const resendLoginOtp = useCallback(({ mfaToken }) => authApi.resendLoginOtp({ mfaToken }), []);

  const register = useCallback(({ name, email, password, phone }) =>
    authApi.register({ name, email, password, phone }), []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const { data } = await authApi.getMe();
    setUser(data.data);
    return data.data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isInitializing,
      login,
      verifyLoginOtp,
      resendLoginOtp,
      register,
      logout,
      refreshMe,
    }),
    [user, isInitializing, login, verifyLoginOtp, resendLoginOtp, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export { AuthProvider, useAuth };
