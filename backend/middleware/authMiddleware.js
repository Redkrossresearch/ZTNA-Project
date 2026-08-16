const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const Session = require('../models/Session');

/**
 * Protects routes by requiring a valid JWT access token.
 * Accepts token from Authorization: Bearer header or httpOnly cookie.
 * Attaches the authenticated user to req.user.
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. No token provided.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Invalid or expired token.',
      });
    }

    if (decoded.type === 'mfa_pending' || decoded.type === 'password_reset_pending') {
      return res.status(401).json({
        success: false,
        message: 'This token cannot be used to access protected resources.',
      });
    }

    // Reject tokens that were explicitly revoked (logout / admin revoke / password change)
    if (decoded.jti) {
      const blacklisted = await BlacklistedToken.findOne({ jti: decoded.jti });
      if (blacklisted) {
        return res.status(401).json({
          success: false,
          message: 'This session has been revoked. Please log in again.',
        });
      }
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. User no longer exists.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Access denied.`,
      });
    }

    req.user = user;
    req.token = token;
    req.jti = decoded.jti;

    // Touch session activity timestamp (fire-and-forget, doesn't block the request)
    if (decoded.jti) {
      Session.updateOne({ jti: decoded.jti }, { lastActivityAt: new Date() }).exec();
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

module.exports = { protect };
