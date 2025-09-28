const express = require('express');
const { body, param } = require('express-validator');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserStats
} = require('../controllers/userController');
const { protect, adminOnly, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', protect, adminOnly, getUsers);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin only)
router.get('/stats', protect, adminOnly, getUserStats);

// @route   GET /api/users/role/:role
// @desc    Get users by role
// @access  Private
router.get('/role/:role', protect, [
  param('role')
    .isIn(['admin', 'teacher', 'parent', 'staff', 'finance'])
    .withMessage('Invalid role specified')
], getUsersByRole);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
], getUser);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/', protect, adminOnly, [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .isIn(['admin', 'teacher', 'parent', 'staff', 'finance'])
    .withMessage('Invalid role specified'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('employeeId')
    .if(body('role').isIn(['teacher', 'staff', 'finance']))
    .notEmpty()
    .withMessage('Employee ID is required for staff roles'),
  body('department')
    .if(body('role').isIn(['teacher', 'staff', 'finance']))
    .isIn(['administration', 'teaching', 'finance', 'maintenance', 'kitchen'])
    .withMessage('Valid department is required for staff roles'),
  body('salary')
    .if(body('role').isIn(['teacher', 'staff', 'finance']))
    .isNumeric()
    .withMessage('Valid salary is required for staff roles'),
  body('hireDate')
    .if(body('role').isIn(['teacher', 'staff', 'finance']))
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid hire date')
], createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or own profile)
router.put('/:id', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['admin', 'teacher', 'parent', 'staff', 'finance'])
    .withMessage('Invalid role specified'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('salary')
    .optional()
    .isNumeric()
    .withMessage('Salary must be a number'),
  body('hireDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid hire date')
], updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', protect, adminOnly, [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
], deleteUser);

module.exports = router;
