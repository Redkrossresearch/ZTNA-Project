const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication AND the 'admin' role
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/trends', getDashboardTrends);
router.get('/dashboard/risk-distribution', getRiskDistribution);
router.get('/dashboard/incidents-by-severity', getIncidentsBySeverity);
router.get('/dashboard/top-locations', getTopLocations);
router.get('/dashboard/export/users', exportUsersCsv);
router.get('/dashboard/export/incidents', exportIncidentsCsv);

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/status', changeUserStatus);
router.patch('/users/:id/role', changeUserRole);

module.exports = router;
