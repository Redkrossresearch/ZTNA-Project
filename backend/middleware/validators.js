const { body, validationResult } = require('express-validator');

/**
 * Runs accumulated express-validator checks and short-circuits
 * with a 422 response if any failed.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),

  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const loginValidationRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  handleValidationErrors,
  registerValidationRules,
  loginValidationRules,
};
