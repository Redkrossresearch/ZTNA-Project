const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { checkIp } = require('../controllers/threatIntelController');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/check/:ip', checkIp);

module.exports = router;
