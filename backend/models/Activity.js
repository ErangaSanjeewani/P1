const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Activity title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Activity description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  activityType: {
    type: String,
    enum: ['educational', 'recreational', 'outdoor', 'arts_crafts', 'music', 'story_time', 'physical', 'field_trip', 'special_event'],
    required: [true, 'Activity type is required']
  },
  date: {
    type: Date,
    required: [true, 'Activity date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  assistants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  targetAgeGroup: {
    min: {
      type: Number,
      required: [true, 'Minimum age is required'],
      min: [0, 'Age cannot be negative']
    },
    max: {
      type: Number,
      required: [true, 'Maximum age is required'],
      min: [0, 'Age cannot be negative']
    }
  },
  maxParticipants: {
    type: Number,
    required: [true, 'Maximum participants is required'],
    min: [1, 'Must allow at least 1 participant']
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child'
  }],
  materials: [{
    item: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    obtained: {
      type: Boolean,
      default: false
    }
  }],
  objectives: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  photos: [{
    filename: String,
    originalName: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  // Recurring activity info
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: function() {
        return this.isRecurring;
      }
    },
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    endDate: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
activitySchema.index({ date: 1 });
activitySchema.index({ teacher: 1 });
activitySchema.index({ activityType: 1 });
activitySchema.index({ status: 1 });
activitySchema.index({ participants: 1 });

// Virtual for duration
activitySchema.virtual('duration').get(function() {
  if (!this.startTime || !this.endTime) return null;
  
  const start = new Date(`2000-01-01 ${this.startTime}`);
  const end = new Date(`2000-01-01 ${this.endTime}`);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
});

// Ensure virtual fields are serialized
activitySchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Activity', activitySchema);
