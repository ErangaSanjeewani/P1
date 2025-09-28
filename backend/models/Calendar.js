const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  eventType: {
    type: String,
    enum: ['holiday', 'field_trip', 'parent_meeting', 'staff_meeting', 'training', 'special_event', 'birthday', 'maintenance', 'closure'],
    required: [true, 'Event type is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  startTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  attendees: {
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    children: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child'
    }],
    external: [{
      name: String,
      email: String,
      phone: String
    }]
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Recurring event info
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: function() {
        return this.isRecurring;
      }
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    endRecurrence: {
      type: Date,
      required: function() {
        return this.isRecurring;
      }
    }
  },
  // Notifications
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push'],
      required: true
    },
    timing: {
      type: String,
      enum: ['15_minutes', '30_minutes', '1_hour', '2_hours', '1_day', '1_week'],
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    }
  }],
  // Additional details
  requirements: [{
    type: String,
    trim: true
  }],
  materials: [{
    type: String,
    trim: true
  }],
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative']
  },
  maxAttendees: {
    type: Number,
    min: [1, 'Must allow at least 1 attendee']
  },
  registrationRequired: {
    type: Boolean,
    default: false
  },
  registrationDeadline: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
calendarSchema.index({ startDate: 1, endDate: 1 });
calendarSchema.index({ eventType: 1 });
calendarSchema.index({ organizer: 1 });
calendarSchema.index({ status: 1 });
calendarSchema.index({ 'attendees.users': 1 });
calendarSchema.index({ 'attendees.children': 1 });

// Virtual for duration
calendarSchema.virtual('duration').get(function() {
  if (this.isAllDay) return 'All Day';
  if (!this.startTime || !this.endTime) return null;
  
  const start = new Date(`2000-01-01 ${this.startTime}`);
  const end = new Date(`2000-01-01 ${this.endTime}`);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
});

// Ensure virtual fields are serialized
calendarSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Calendar', calendarSchema);
