const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { getMyAccessLogs, getAllAccessLogs } = require('../controllers/accessLogController');

const router = express.Router();

router.use(protect);

router.get('/me', getMyAccessLogs);
router.get('/', authorize('admin'), getAllAccessLogs);

module.exports = router;
