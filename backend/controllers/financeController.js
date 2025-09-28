const { validationResult } = require('express-validator');
const Finance = require('../models/Finance');
const User = require('../models/User');
const Child = require('../models/Child');

// @desc    Get all transactions
// @route   GET /api/finance
// @access  Private (Finance, Admin)
const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Finance.find(filter)
      .populate('relatedChild', 'firstName lastName')
      .populate('relatedParent', 'firstName lastName email')
      .populate('relatedEmployee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Finance.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Finance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summaryData = {
      totalIncome: summary.find(s => s._id === 'income')?.total || 0,
      totalExpenses: summary.find(s => s._id === 'expense')?.total || 0,
      incomeCount: summary.find(s => s._id === 'income')?.count || 0,
      expenseCount: summary.find(s => s._id === 'expense')?.count || 0
    };

    summaryData.netIncome = summaryData.totalIncome - summaryData.totalExpenses;

    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      summary: summaryData
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/finance/:id
// @access  Private (Finance, Admin)
const getTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const transaction = await Finance.findById(req.params.id)
      .populate('relatedChild', 'firstName lastName dateOfBirth')
      .populate('relatedParent', 'firstName lastName email phone')
      .populate('relatedEmployee', 'firstName lastName email department')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction'
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/finance
// @access  Private (Finance, Admin)
const createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      type,
      category,
      amount,
      description,
      date,
      relatedChild,
      relatedParent,
      relatedEmployee,
      paymentMethod,
      isRecurring,
      recurringFrequency,
      tags
    } = req.body;

    // Verify related entities exist
    if (relatedChild) {
      const child = await Child.findById(relatedChild);
      if (!child) {
        return res.status(400).json({
          success: false,
          message: 'Related child not found'
        });
      }
    }

    if (relatedParent || relatedEmployee) {
      const userId = relatedParent || relatedEmployee;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Related user not found'
        });
      }
    }

    const transaction = new Finance({
      type,
      category,
      amount,
      description,
      date: date || new Date(),
      relatedChild,
      relatedParent,
      relatedEmployee,
      paymentMethod,
      isRecurring: isRecurring || false,
      recurringFrequency,
      tags: tags || [],
      createdBy: req.user._id,
      status: 'pending'
    });

    await transaction.save();

    const populatedTransaction = await Finance.findById(transaction._id)
      .populate('relatedChild', 'firstName lastName')
      .populate('relatedParent', 'firstName lastName email')
      .populate('relatedEmployee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedTransaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating transaction'
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/finance/:id
// @access  Private (Finance, Admin)
const updateTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const transaction = await Finance.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if transaction is approved and user is not admin
    if (transaction.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify approved transactions'
      });
    }

    const updateFields = { ...req.body };
    delete updateFields.createdBy; // Prevent changing creator
    delete updateFields.approvedBy; // Prevent changing approver

    const updatedTransaction = await Finance.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate('relatedChild', 'firstName lastName')
      .populate('relatedParent', 'firstName lastName email')
      .populate('relatedEmployee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      data: updatedTransaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating transaction'
    });
  }
};

// @desc    Approve/reject transaction
// @route   PUT /api/finance/:id/approve
// @access  Private (Admin only)
const approveTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { approved, approvalNotes } = req.body;

    const transaction = await Finance.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    transaction.status = approved ? 'approved' : 'rejected';
    transaction.approvedBy = req.user._id;
    transaction.approvedAt = new Date();
    if (approvalNotes) {
      transaction.approvalNotes = approvalNotes;
    }

    await transaction.save();

    const populatedTransaction = await Finance.findById(transaction._id)
      .populate('relatedChild', 'firstName lastName')
      .populate('relatedParent', 'firstName lastName email')
      .populate('relatedEmployee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      data: populatedTransaction,
      message: `Transaction ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Approve transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing transaction approval'
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/finance/:id
// @access  Private (Admin only)
const deleteTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const transaction = await Finance.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await Finance.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting transaction'
    });
  }
};

// @desc    Get pending transactions
// @route   GET /api/finance/pending
// @access  Private (Finance, Admin)
const getPendingTransactions = async (req, res) => {
  try {
    const pendingTransactions = await Finance.find({ status: 'pending' })
      .populate('relatedChild', 'firstName lastName')
      .populate('relatedParent', 'firstName lastName email')
      .populate('relatedEmployee', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingTransactions,
      count: pendingTransactions.length
    });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending transactions'
    });
  }
};

// @desc    Get financial report
// @route   GET /api/finance/report
// @access  Private (Finance, Admin)
const getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    const matchStage = { status: 'approved' };
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    // Group by date format based on groupBy parameter
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%U';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const report = await Finance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: dateFormat, date: '$date' } },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
            }
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
            }
          },
          incomeCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$count', 0]
            }
          },
          expenseCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$count', 0]
            }
          }
        }
      },
      {
        $addFields: {
          netIncome: { $subtract: ['$income', '$expenses'] },
          period: '$_id'
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category breakdown
    const categoryBreakdown = await Finance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        periodReport: report,
        categoryBreakdown,
        summary: {
          totalIncome: report.reduce((sum, period) => sum + period.income, 0),
          totalExpenses: report.reduce((sum, period) => sum + period.expenses, 0),
          netIncome: report.reduce((sum, period) => sum + period.netIncome, 0)
        }
      }
    });
  } catch (error) {
    console.error('Get financial report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating financial report'
    });
  }
};

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  getPendingTransactions,
  getFinancialReport
};