const express = require('express');
const { body, param } = require('express-validator');
const {
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  addParticipant,
  removeParticipant,
  getActivityStats
} = require('../controllers/activityController');
const { protect, adminOnly, teacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/activities
// @desc    Get all activities (role-based)
// @access  Private
router.get('/', protect, getActivities);

// @route   GET /api/activities/stats
// @desc    Get activity statistics
// @access  Private (Admin, Teacher)
router.get('/stats', protect, teacherOrAdmin, getActivityStats);

// @route   GET /api/activities/:id
// @desc    Get single activity
// @access  Private
router.get('/:id', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid activity ID')
], getActivity);

// @route   POST /api/activities
// @desc    Create new activity
// @access  Private (Admin, Teacher)
router.post('/', protect, teacherOrAdmin, [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('type')
    .isIn(['educational', 'recreational', 'physical', 'creative', 'social', 'outdoor', 'field_trip'])
    .withMessage('Invalid activity type'),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('teacher')
    .isMongoId()
    .withMessage('Valid teacher ID is required'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max participants must be a positive integer'),
  body('ageGroup')
    .optional()
    .isIn(['infant', 'toddler', 'preschool', 'kindergarten', 'mixed'])
    .withMessage('Invalid age group'),
  body('materials')
    .optional()
    .isArray()
    .withMessage('Materials must be an array'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring must be a boolean'),
  body('recurringPattern.frequency')
    .if(body('isRecurring').equals('true'))
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Invalid recurring frequency'),
  body('recurringPattern.daysOfWeek')
    .if(body('recurringPattern.frequency').equals('weekly'))
    .isArray()
    .withMessage('Days of week must be an array for weekly recurring activities')
], createActivity);

// @route   PUT /api/activities/:id
// @desc    Update activity
// @access  Private (Admin, Teacher - own activities)
router.put('/:id', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid activity ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('type')
    .optional()
    .isIn(['educational', 'recreational', 'physical', 'creative', 'social', 'outdoor', 'field_trip'])
    .withMessage('Invalid activity type'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max participants must be a positive integer'),
  body('status')
    .optional()
    .isIn(['planned', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be planned, in_progress, completed, or cancelled'),
  body('materials')
    .optional()
    .isArray()
    .withMessage('Materials must be an array'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters')
], updateActivity);

// @route   POST /api/activities/:id/participants
// @desc    Add participant to activity
// @access  Private (Admin, Teacher)
router.post('/:id/participants', protect, teacherOrAdmin, [
  param('id')
    .isMongoId()
    .withMessage('Invalid activity ID'),
  body('childId')
    .isMongoId()
    .withMessage('Valid child ID is required')
], addParticipant);

// @route   DELETE /api/activities/:id/participants/:childId
// @desc    Remove participant from activity
// @access  Private (Admin, Teacher)
router.delete('/:id/participants/:childId', protect, teacherOrAdmin, [
  param('id')
    .isMongoId()
    .withMessage('Invalid activity ID'),
  param('childId')
    .isMongoId()
    .withMessage('Invalid child ID')
], removeParticipant);

// @route   DELETE /api/activities/:id
// @desc    Delete activity
// @access  Private (Admin only)
router.delete('/:id', protect, adminOnly, [
  param('id')
    .isMongoId()
    .withMessage('Invalid activity ID')
], deleteActivity);

module.exports = router;
