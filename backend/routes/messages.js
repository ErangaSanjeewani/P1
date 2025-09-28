const express = require('express');
const { body, param } = require('express-validator');
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages
// @desc    Get messages for current user
// @access  Private
router.get('/', protect, messageController.getMessages);

// @route   GET /api/messages/unread-count
// @desc    Get unread message count
// @access  Private
router.get('/unread-count', protect, messageController.getUnreadCount);

// @route   GET /api/messages/conversation/:childId
// @desc    Get conversation for a specific child
// @access  Private
router.get('/conversation/:childId', protect, [
  param('childId')
    .isMongoId()
    .withMessage('Invalid child ID')
], messageController.getConversation);

// @route   GET /api/messages/:id
// @desc    Get single message
// @access  Private
router.get('/:id', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID')
], messageController.getMessageById);

// @route   POST /api/messages
// @desc    Send new message
// @access  Private
router.post('/', protect, [
  body('recipient')
    .isMongoId()
    .withMessage('Valid recipient ID is required'),
  body('child')
    .isMongoId()
    .withMessage('Valid child ID is required'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be low, normal, high, or urgent'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  body('attachments.*.filename')
    .if(body('attachments').exists())
    .notEmpty()
    .withMessage('Attachment filename is required'),
  body('attachments.*.url')
    .if(body('attachments').exists())
    .isURL()
    .withMessage('Attachment URL must be valid')
], messageController.sendMessage);

// @route   POST /api/messages/:id/reply
// @desc    Reply to message
// @access  Private
router.post('/:id/reply', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Reply content must be between 1 and 2000 characters'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  body('attachments.*.filename')
    .if(body('attachments').exists())
    .notEmpty()
    .withMessage('Attachment filename is required'),
  body('attachments.*.url')
    .if(body('attachments').exists())
    .isURL()
    .withMessage('Attachment URL must be valid')
], messageController.replyToMessage);

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', protect, [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID')
], messageController.markAsRead);

module.exports = router;
