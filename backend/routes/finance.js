const express = require('express');
const { body, param } = require('express-validator');
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  getFinancialReport,
  getPendingTransactions
} = require('../controllers/financeController');
const { protect, adminOnly, financeAccess } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/finance
// @desc    Get all transactions
// @access  Private (Finance, Admin)
router.get('/', protect, financeAccess, getTransactions);

// @route   GET /api/finance/pending
// @desc    Get pending transactions
// @access  Private (Finance, Admin)
router.get('/pending', protect, financeAccess, getPendingTransactions);

// @route   GET /api/finance/report
// @desc    Get financial report
// @access  Private (Finance, Admin)
router.get('/report', protect, financeAccess, getFinancialReport);

// @route   GET /api/finance/:id
// @desc    Get single transaction
// @access  Private (Finance, Admin)
router.get('/:id', protect, financeAccess, [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID')
], getTransaction);

// @route   POST /api/finance
// @desc    Create new transaction
// @access  Private (Finance, Admin)
router.post('/', protect, financeAccess, [
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Transaction type must be income or expense'),
  body('category')
    .notEmpty()
    .withMessage('Category is required'),
  body('amount')
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('relatedChild')
    .optional()
    .isMongoId()
    .withMessage('Invalid child ID'),
  body('relatedParent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent ID'),
  body('relatedEmployee')
    .optional()
    .isMongoId()
    .withMessage('Invalid employee ID'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'online'])
    .withMessage('Invalid payment method'),
  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring must be a boolean'),
  body('recurringFrequency')
    .if(body('isRecurring').equals('true'))
    .isIn(['weekly', 'monthly', 'quarterly', 'annually'])
    .withMessage('Invalid recurring frequency'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], createTransaction);

// @route   PUT /api/finance/:id
// @desc    Update transaction
// @access  Private (Finance, Admin)
router.put('/:id', protect, financeAccess, [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID'),
  body('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Transaction type must be income or expense'),
  body('category')
    .optional()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('amount')
    .optional()
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('relatedChild')
    .optional()
    .isMongoId()
    .withMessage('Invalid child ID'),
  body('relatedParent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent ID'),
  body('relatedEmployee')
    .optional()
    .isMongoId()
    .withMessage('Invalid employee ID'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'online'])
    .withMessage('Invalid payment method'),
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Status must be pending, approved, or rejected'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], updateTransaction);

// @route   PUT /api/finance/:id/approve
// @desc    Approve transaction
// @access  Private (Admin only)
router.put('/:id/approve', protect, adminOnly, [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID'),
  body('approved')
    .isBoolean()
    .withMessage('Approved status must be a boolean'),
  body('approvalNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Approval notes must be less than 500 characters')
], approveTransaction);

// @route   DELETE /api/finance/:id
// @desc    Delete transaction
// @access  Private (Admin only)
router.delete('/:id', protect, adminOnly, [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID')
], deleteTransaction);

module.exports = router;
