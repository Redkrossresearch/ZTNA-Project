# ZTNA Security Platform — Full Stack

This package contains two independent projects:

```
ztna-fullstack/
├── backend/    <- your original backend, completely unmodified
└── frontend/   <- the React frontend built to match it, phase by phase
```

## backend/

This is **exactly** the backend you originally uploaded — not a single file was changed, renamed, or added.
Start it however you normally do (e.g. `npm install && npm start`), using your existing `.env`.

## frontend/

See `frontend/README.md` for setup. Quick start:

```bash
cd frontend
npm install
cp .env.example .env   # set REACT_APP_API_BASE_URL to point at the backend above
npm start
```

By default the frontend expects the backend at `http://localhost:5000/api` — adjust `frontend/.env` if your backend runs elsewhere.

## Notes

- No endpoints were invented on the frontend — every API call maps 1:1 to a real route in `backend/routes/`.
- Two gaps were found and intentionally left unfilled rather than faked (see `frontend/README.md`): no profile-edit endpoint, and no endpoint to list sessions across all users.
