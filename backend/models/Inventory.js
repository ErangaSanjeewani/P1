const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  category: {
    type: String,
    enum: ['toys', 'books', 'art_supplies', 'educational_materials', 'furniture', 'electronics', 'safety_equipment', 'cleaning_supplies', 'food_supplies', 'medical_supplies', 'outdoor_equipment', 'office_supplies'],
    required: [true, 'Category is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  quantity: {
    current: {
      type: Number,
      required: [true, 'Current quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    minimum: {
      type: Number,
      required: [true, 'Minimum quantity is required'],
      min: [0, 'Minimum quantity cannot be negative']
    },
    maximum: {
      type: Number,
      min: [0, 'Maximum quantity cannot be negative']
    }
  },
  unit: {
    type: String,
    enum: ['pieces', 'boxes', 'bottles', 'packs', 'sets', 'rolls', 'bags', 'liters', 'kilograms', 'meters'],
    required: [true, 'Unit is required']
  },
  location: {
    room: {
      type: String,
      required: [true, 'Room is required']
    },
    shelf: String,
    section: String
  },
  supplier: {
    name: String,
    contact: String,
    email: String,
    phone: String
  },
  purchaseInfo: {
    purchaseDate: Date,
    unitCost: {
      type: Number,
      min: [0, 'Unit cost cannot be negative']
    },
    totalCost: {
      type: Number,
      min: [0, 'Total cost cannot be negative']
    },
    invoiceNumber: String
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
    default: 'good'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'disposed'],
    default: 'active'
  },
  maintenanceSchedule: {
    lastMaintenance: Date,
    nextMaintenance: Date,
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'annually']
    },
    notes: String
  },
  safetyInfo: {
    ageRestriction: {
      min: Number,
      max: Number
    },
    hazardWarnings: [String],
    certifications: [String]
  },
  isLowStock: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  images: [{
    filename: String,
    originalName: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
inventorySchema.index({ category: 1 });
inventorySchema.index({ itemName: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ isLowStock: 1 });
inventorySchema.index({ 'location.room': 1 });

// Pre-save middleware to check low stock
inventorySchema.pre('save', function(next) {
  this.isLowStock = this.quantity.current <= this.quantity.minimum;
  next();
});

// Virtual for total value
inventorySchema.virtual('totalValue').get(function() {
  if (this.purchaseInfo && this.purchaseInfo.unitCost) {
    return this.quantity.current * this.purchaseInfo.unitCost;
  }
  return 0;
});

// Ensure virtual fields are serialized
inventorySchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Inventory', inventorySchema);
