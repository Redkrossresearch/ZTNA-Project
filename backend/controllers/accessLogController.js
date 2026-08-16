const AccessLog = require('../models/AccessLog');

/**
 * GET /api/access-logs/me
 * Returns the current user's own access log history, paginated.
 */
const getMyAccessLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AccessLog.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessLog.countDocuments({ userId: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch access logs', error: error.message });
  }
};

/**
 * GET /api/access-logs
 * Admin-only. Returns access logs across all users, filterable by userId/action.
 */
const getAllAccessLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      AccessLog.find(filter).populate('userId', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch access logs', error: error.message });
  }
};

module.exports = { getMyAccessLogs, getAllAccessLogs };
