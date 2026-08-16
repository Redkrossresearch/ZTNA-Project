/**
 * Mirrors backend/utils/passwordPolicy.js exactly, so the UI can show
 * real-time feedback instead of round-tripping to the server on every
 * keystroke. The backend remains the final authority — this never
 * replaces the 422 validation response, it just previews it.
 */
const validatePasswordPolicy = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) errors.push('At least 8 characters');
  if (password.length > 128) errors.push('Must not exceed 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least one number');
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]/~`;']/.test(password)) {
    errors.push('At least one special character');
  }

  return { valid: errors.length === 0, errors };
};

export { validatePasswordPolicy };
