const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const Session = require('../models/Session');
const Incident = require('../models/Incident');

/**
 * GET /api/admin/users
 * Returns all users (paginated), excluding password field.
 */
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: users.map((u) => u.toSafeObject()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user.toSafeObject() });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account while logged in as it.',
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { id: user._id },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Body: { status: "active" | "inactive" | "suspended" }
 */
const changeUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['active', 'inactive', 'suspended'];

    if (!allowedStatuses.includes(status)) {
      return res.status(422).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change the status of your own account.',
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: `User status updated to '${status}'`,
      data: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
};

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role: "admin" | "user" }
 */
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['admin', 'user'];

    if (!allowedRoles.includes(role)) {
      return res.status(422).json({
        success: false,
        message: `Role must be one of: ${allowedRoles.join(', ')}`,
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change the role of your own account.',
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: `User role updated to '${role}'`,
      data: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update role', error: error.message });
  }
};

/**
 * GET /api/admin/dashboard
 * Aggregate statistics for the admin dashboard.
 *
 * Note: "Total Incidents" reads from the Incident collection once the
 * Incident model is registered (Phase 8). Until then it is honestly
 * reported as 0 — there is no incident tracking yet, not a fake number.
 */
const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, inactiveUsers, suspendedUsers, adminUsers, normalUsers, failedLogins] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'inactive' }),
        User.countDocuments({ status: 'suspended' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ role: 'user' }),
        AccessLog.countDocuments({ action: 'login_failed' }),
      ]);

    const totalIncidents = await Incident.countDocuments({});

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        adminUsers,
        normalUsers,
        failedLogins,
        totalIncidents,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

/**
 * GET /api/admin/dashboard/trends?days=30
 * Daily time-series for the last N days (default 30, max 90):
 * new user signups, logins, failed logins, and incidents per day.
 * Designed to feed line/bar charts on the admin dashboard frontend.
 */
const getDashboardTrends = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);

    const dateGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const [signups, logins, failedLogins, incidents] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dateGroup, count: { $sum: 1 } } },
      ]),
      AccessLog.aggregate([
        { $match: { createdAt: { $gte: since }, action: 'login' } },
        { $group: { _id: dateGroup, count: { $sum: 1 } } },
      ]),
      AccessLog.aggregate([
        { $match: { createdAt: { $gte: since }, action: 'login_failed' } },
        { $group: { _id: dateGroup, count: { $sum: 1 } } },
      ]),
      Incident.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: dateGroup, count: { $sum: 1 } } },
      ]),
    ]);

    // Build a complete day-by-day series (filling zero-count days) so the
    // frontend chart doesn't have to handle gaps.
    const toMap = (arr) => Object.fromEntries(arr.map((d) => [d._id, d.count]));
    const signupsMap = toMap(signups);
    const loginsMap = toMap(logins);
    const failedLoginsMap = toMap(failedLogins);
    const incidentsMap = toMap(incidents);

    const series = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      series.push({
        date: key,
        signups: signupsMap[key] || 0,
        logins: loginsMap[key] || 0,
        failedLogins: failedLoginsMap[key] || 0,
        incidents: incidentsMap[key] || 0,
      });
    }

    return res.status(200).json({ success: true, data: series });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard trends', error: error.message });
  }
};

/**
 * GET /api/admin/dashboard/risk-distribution
 * Breaks down login sessions by risk level — feeds a pie/donut chart.
 */
const getRiskDistribution = async (req, res) => {
  try {
    const distribution = await Session.aggregate([
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
    ]);

    const result = { low: 0, medium: 0, high: 0 };
    distribution.forEach((d) => {
      if (d._id && result[d._id] !== undefined) result[d._id] = d.count;
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch risk distribution', error: error.message });
  }
};

/**
 * GET /api/admin/dashboard/incidents-by-severity
 * Feeds a severity breakdown chart, optionally filtered to open incidents only.
 */
const getIncidentsBySeverity = async (req, res) => {
  try {
    const filter = req.query.openOnly === 'true' ? { status: { $in: ['open', 'investigating'] } } : {};

    const breakdown = await Incident.aggregate([
      { $match: filter },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const result = { low: 0, medium: 0, high: 0, critical: 0 };
    breakdown.forEach((d) => {
      if (d._id && result[d._id] !== undefined) result[d._id] = d.count;
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch incident severity breakdown', error: error.message });
  }
};

/**
 * GET /api/admin/dashboard/top-locations?limit=10
 * Top login countries by session count — feeds a bar chart or map overlay.
 */
const getTopLocations = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const topCountries = await Session.aggregate([
      { $match: { 'location.country': { $ne: null } } },
      { $group: { _id: '$location.country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return res.status(200).json({
      success: true,
      data: topCountries.map((c) => ({ country: c._id, count: c.count })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch top locations', error: error.message });
  }
};

/**
 * GET /api/admin/dashboard/summary
 * Single combined call so the dashboard frontend can render everything
 * (stat cards + all chart data) with one request instead of five.
 */
const getDashboardSummary = async (req, res) => {
  try {
    const fakeReq = { query: {} };
    const results = {};

    const capture = (key) => ({
      status: () => ({ json: (body) => { results[key] = body.data; } }),
    });

    await Promise.all([
      getDashboardStats(req, capture('stats')),
      getDashboardTrends(fakeReq, capture('trends')),
      getRiskDistribution(req, capture('riskDistribution')),
      getIncidentsBySeverity(req, capture('incidentsBySeverity')),
      getTopLocations(fakeReq, capture('topLocations')),
    ]);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary', error: error.message });
  }
};

/**
 * Converts an array of flat objects to a CSV string. Minimal, dependency-free
 * implementation — handles quoting/escaping for commas, quotes, and newlines.
 */
const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  });
  return lines.join('\n');
};

/**
 * GET /api/admin/dashboard/export/users
 * Exports all users as a downloadable CSV report.
 */
const exportUsersCsv = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });

    const rows = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      mfaEnabled: u.isMfaEnabled,
      mfaMethod: u.mfaMethod,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : '',
      lastLoginCountry: u.lastLoginCountry || '',
      createdAt: u.createdAt.toISOString(),
    }));

    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_report_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export users report', error: error.message });
  }
};

/**
 * GET /api/admin/dashboard/export/incidents
 * Exports all incidents as a downloadable CSV report.
 */
const exportIncidentsCsv = async (req, res) => {
  try {
    const incidents = await Incident.find({}).populate('userId', 'name email').sort({ createdAt: -1 });

    const rows = incidents.map((i) => ({
      id: i._id.toString(),
      user: i.userId ? `${i.userId.name} <${i.userId.email}>` : 'Unknown',
      severity: i.severity,
      status: i.status,
      source: i.source,
      reason: i.reason,
      ip: i.ip,
      country: i.location?.country || '',
      createdAt: i.createdAt.toISOString(),
    }));

    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="incidents_report_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export incidents report', error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  deleteUser,
  changeUserStatus,
  changeUserRole,
  getDashboardStats,
  getDashboardTrends,
  getRiskDistribution,
  getIncidentsBySeverity,
  getTopLocations,
  getDashboardSummary,
  exportUsersCsv,
  exportIncidentsCsv,
};
