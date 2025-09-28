const express = require('express');
const { body, param } = require('express-validator');
const {
  getChildren,
  getChild,
  createChild,
  updateChild,
  deleteChild,
  getChildrenByClassroom,
  getChildStats
} = require('../controllers/childController');
const { protect, adminOnly, teacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/children
// @desc    Get all children (role-based)
// @access  Private
router.get('/', protect, getChildren);

// @route   GET /api/children/stats
// @desc    Get children statistics
// @access  Private (Admin, Teacher)
router.get('/stats', protect, teacherOrAdmin, getChildStats);

// @route   GET /api/children/classroom/:classroom
// @desc    Get children by classroom
// @access  Private
router.get('/classroom/:classroom', protect, [
  param('classroom')
    .notEmpty()
    .withMessage('Classroom name is required')
], getChildrenByClassroom);

// @route   GET /api/children/:id
// @desc    Get single child
// @access  Private (Role-based)
router.get('/:id', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid child ID')
], getChild);

// @route   POST /api/children
// @desc    Create new child
// @access  Private (Admin, Teacher)
router.post('/', protect, teacherOrAdmin, [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('parents')
    .isArray({ min: 1 })
    .withMessage('At least one parent is required'),
  body('parents.*')
    .isMongoId()
    .withMessage('Invalid parent ID'),
  body('teacher')
    .isMongoId()
    .withMessage('Valid teacher ID is required'),
  body('classroom')
    .notEmpty()
    .withMessage('Classroom assignment is required'),
  body('monthlyFee')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Monthly fee must be a positive number'),
  body('enrollmentDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid enrollment date'),
  body('emergencyContacts')
    .optional()
    .isArray()
    .withMessage('Emergency contacts must be an array'),
  body('emergencyContacts.*.name')
    .if(body('emergencyContacts').exists())
    .notEmpty()
    .withMessage('Emergency contact name is required'),
  body('emergencyContacts.*.phone')
    .if(body('emergencyContacts').exists())
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid emergency contact phone number'),
  body('medicalInfo.allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),
  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array')
], createChild);

// @route   PUT /api/children/:id
// @desc    Update child
// @access  Private (Admin, Teacher, Parent - limited)
router.put('/:id', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid child ID'),
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
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('parents')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one parent is required'),
  body('parents.*')
    .if(body('parents').exists())
    .isMongoId()
    .withMessage('Invalid parent ID'),
  body('teacher')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID'),
  body('monthlyFee')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Monthly fee must be a positive number'),
  body('feeStatus')
    .optional()
    .isIn(['paid', 'pending', 'overdue'])
    .withMessage('Fee status must be paid, pending, or overdue'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('emergencyContacts')
    .optional()
    .isArray()
    .withMessage('Emergency contacts must be an array'),
  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array')
], updateChild);

// @route   DELETE /api/children/:id
// @desc    Delete child
// @access  Private (Admin only)
router.delete('/:id', protect, adminOnly, [
  param('id')
    .isMongoId()
    .withMessage('Invalid child ID')
], deleteChild);

module.exports = router;
