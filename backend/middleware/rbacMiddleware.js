/**
 * Role-Based Access Control middleware.
 * Usage: authorize('admin') or authorize('admin', 'user')
 * Must be used AFTER `protect` so req.user is populated.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${allowedRoles.join(' or ')}.`,
      });
    }

    next();
  };
};

module.exports = { authorize };
