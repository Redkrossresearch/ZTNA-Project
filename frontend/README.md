# ZTNA Frontend

React SPA built strictly against your existing ZTNA backend — no invented endpoints, no mock data.

## Setup

```bash
npm install
cp .env.example .env   # edit REACT_APP_API_BASE_URL if your backend isn't on localhost:5000
npm start
```

Requires the backend running (default expected at `http://localhost:5000/api`).

## What's included

- **Auth**: Login, Register, Forgot/Reset Password, OTP verification (email/SMS MFA), protected + admin route guards
- **Dashboard & Profile**: account overview, MFA method management, phone verification
- **Admin module**: User management (role/status/delete), Incident management, platform-wide Access Logs, Admin Dashboard analytics
- **Security module**: My Sessions (device/geo/risk data + revoke), my Access Logs, my Security Alerts (with risk-engine/threat-intel detail), admin IP reputation lookup
- **Enterprise polish**: toasts, skeleton loaders, error boundary, responsive layout, accessibility (focus trapping, aria-labels, skip link), code-split routes

## Known, intentional gaps (matching real backend limitations — not bugs)

- No profile-editing form: the backend has no endpoint to update name/email.
- No "list all users' sessions" admin page: the backend only exposes a user's own sessions and revoke-by-ID; faking a cross-user session table would mean inventing data. The Admin Dashboard's Risk Distribution chart shows the real aggregate session data instead.
- No silent token refresh: the backend has no `/refresh-token` endpoint. A 401 logs the user out.

## Environment variables

See `.env.example` — only `REACT_APP_API_BASE_URL` is required.
