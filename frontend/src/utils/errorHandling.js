/**
 * Every backend controller returns errors as either:
 *   { success: false, message: '...' }
 *   { success: false, message: 'Validation failed', errors: [{ field, message }] }
 *   { success: false, message: '...', errors: ['...'] }  (password policy)
 * This normalizes all three shapes into a single display string plus an
 * optional field-level error list for forms.
 */
const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) {
    return error?.message === 'Network Error'
      ? 'Unable to reach the server. Please check your connection.'
      : 'Something went wrong. Please try again.';
  }

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === 'string') return first;
    if (first?.message) return first.message;
  }

  return data.message || 'Something went wrong. Please try again.';
};

const getFieldErrors = (error) => {
  const data = error?.response?.data;
  if (!Array.isArray(data?.errors)) return {};

  return data.errors.reduce((acc, e) => {
    if (e && typeof e === 'object' && e.field) {
      acc[e.field] = e.message;
    }
    return acc;
  }, {});
};

export { getErrorMessage, getFieldErrors };
