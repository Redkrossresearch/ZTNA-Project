const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMySessions, revokeSession } = require('../controllers/sessionController');

const router = express.Router();

router.use(protect);

router.get('/', getMySessions);
router.delete('/:id', revokeSession);

module.exports = router;
