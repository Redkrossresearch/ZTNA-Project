/**
 * Centralized, validated access to frontend environment variables.
 * Mirrors the backend's config/env.js pattern: fail loudly and early
 * instead of quietly falling back to a wrong URL in production.
 */
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

if (!API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    '[Config] Missing required environment variable: REACT_APP_API_BASE_URL. ' +
      'Create a .env file based on .env.example.'
  );
}

const env = {
  API_BASE_URL: API_BASE_URL || 'http://localhost:5000/api',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default env;
