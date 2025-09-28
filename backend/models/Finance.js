const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Transaction type is required']
  },
  category: {
    type: String,
    enum: [
      // Income categories
      'tuition_fees', 'registration_fees', 'late_fees', 'activity_fees', 'donations', 'grants', 'other_income',
      // Expense categories
      'salaries', 'utilities', 'supplies', 'food', 'maintenance', 'insurance', 'rent', 'equipment', 'training', 'other_expense'
    ],
    required: [true, 'Category is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  transactionDate: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'online_payment'],
    required: [true, 'Payment method is required']
  },
  // For income transactions
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: function() {
      return this.transactionType === 'income' && 
             ['tuition_fees', 'registration_fees', 'late_fees', 'activity_fees'].includes(this.category);
    }
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.transactionType === 'income' && 
             ['tuition_fees', 'registration_fees', 'late_fees', 'activity_fees'].includes(this.category);
    }
  },
  // For expense transactions
  vendor: {
    name: String,
    contact: String,
    address: String
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.category === 'salaries';
    }
  },
  // Transaction details
  invoiceNumber: {
    type: String,
    trim: true
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  // Recurring transaction info
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    required: function() {
      return this.isRecurring;
    }
  },
  nextDueDate: {
    type: Date,
    required: function() {
      return this.isRecurring;
    }
  },
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
financeSchema.index({ transactionType: 1 });
financeSchema.index({ category: 1 });
financeSchema.index({ transactionDate: -1 });
financeSchema.index({ child: 1 });
financeSchema.index({ parent: 1 });
financeSchema.index({ employee: 1 });
financeSchema.index({ status: 1 });
financeSchema.index({ createdBy: 1 });

// Virtual for formatted amount
financeSchema.virtual('formattedAmount').get(function() {
  return `$${this.amount.toFixed(2)}`;
});

// Ensure virtual fields are serialized
financeSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Finance', financeSchema);
