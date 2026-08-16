const Session = require('../models/Session');
const { revokeSessionByJti } = require('../services/sessionService');

/**
 * GET /api/sessions
 * Lists the current user's sessions (active by default, or all if ?all=true).
 */
const getMySessions = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.all !== 'true') {
      filter.isActive = true;
    }

    const sessions = await Session.find(filter).sort({ loginAt: -1 });

    return res.status(200).json({
      success: true,
      data: sessions.map((s) => ({
        ...s.toObject(),
        isCurrent: s.jti === req.jti,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions', error: error.message });
  }
};

/**
 * DELETE /api/sessions/:id
 * Revokes a specific session (e.g. "log out this device") belonging to
 * the current user. Admins may revoke any user's session.
 */
const revokeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const isOwner = session.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to revoke this session' });
    }

    await revokeSessionByJti({
      jti: session.jti,
      userId: session.userId,
      reason: isAdmin && !isOwner ? 'admin_revoked' : 'logout',
    });

    return res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to revoke session', error: error.message });
  }
};

module.exports = { getMySessions, revokeSession };
