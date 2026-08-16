const Incident = require('../models/Incident');
const { raiseIncident } = require('../services/incidentService');
const { getRequestContext } = require('../utils/deviceParser');

/**
 * POST /api/incidents
 * Admin-only. Manually creates an incident (e.g. flagging suspicious
 * activity reported outside automated detection).
 * Body: { userId, severity, reason, metadata? }
 */
const createIncident = async (req, res) => {
  try {
    const { userId, severity, reason, metadata } = req.body;
    const allowedSeverities = ['low', 'medium', 'high', 'critical'];

    if (!userId || !severity || !reason) {
      return res.status(422).json({
        success: false,
        message: 'userId, severity, and reason are required',
      });
    }

    if (!allowedSeverities.includes(severity)) {
      return res.status(422).json({
        success: false,
        message: `severity must be one of: ${allowedSeverities.join(', ')}`,
      });
    }

    const context = getRequestContext(req);
    const incident = await raiseIncident({
      userId,
      severity,
      reason,
      source: 'manual',
      context,
      metadata: metadata || {},
    });

    return res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create incident', error: error.message });
  }
};

/**
 * GET /api/incidents
 * Admin-only. Lists all incidents, paginated and filterable by
 * severity, status, source, and userId.
 */
const getAllIncidents = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.userId) filter.userId = req.query.userId;

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('userId', 'name email role')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Incident.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: incidents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch incidents', error: error.message });
  }
};

/**
 * GET /api/incidents/me
 * Returns the current user's own incidents (transparency — users can see
 * what triggered security flags on their own account).
 */
const getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch incidents', error: error.message });
  }
};

/**
 * GET /api/incidents/:id
 * Admin-only.
 */
const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('userId', 'name email role')
      .populate('resolvedBy', 'name email');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    return res.status(200).json({ success: true, data: incident });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch incident', error: error.message });
  }
};

/**
 * PATCH /api/incidents/:id/status
 * Admin-only. Body: { status, resolutionNotes? }
 */
const updateIncidentStatus = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const allowedStatuses = ['open', 'investigating', 'resolved', 'closed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(422).json({
        success: false,
        message: `status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    incident.status = status;
    if (resolutionNotes) incident.resolutionNotes = resolutionNotes;

    if (status === 'resolved' || status === 'closed') {
      incident.resolvedBy = req.user._id;
      incident.resolvedAt = new Date();
    } else {
      incident.resolvedBy = null;
      incident.resolvedAt = null;
    }

    await incident.save();

    return res.status(200).json({
      success: true,
      message: `Incident status updated to '${status}'`,
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update incident', error: error.message });
  }
};

module.exports = {
  createIncident,
  getAllIncidents,
  getMyIncidents,
  getIncidentById,
  updateIncidentStatus,
};
