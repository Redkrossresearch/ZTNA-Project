const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const {
  createIncident,
  getAllIncidents,
  getMyIncidents,
  getIncidentById,
  updateIncidentStatus,
} = require('../controllers/incidentController');

const router = express.Router();

router.use(protect);

router.get('/me', getMyIncidents);

router.use(authorize('admin'));
router.post('/', createIncident);
router.get('/', getAllIncidents);
router.get('/:id', getIncidentById);
router.patch('/:id/status', updateIncidentStatus);

module.exports = router;
