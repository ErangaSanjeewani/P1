const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required']
  },
  profileImage: {
    type: String,
    default: ''
  },
  // Parent/Guardian Information
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  emergencyContacts: [{
    name: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  }],
  // Medical Information
  medicalInfo: {
    allergies: [{
      type: String,
      trim: true
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      instructions: String
    }],
    medicalConditions: [{
      type: String,
      trim: true
    }],
    doctorName: String,
    doctorPhone: String,
    insuranceProvider: String,
    insuranceNumber: String
  },
  // Enrollment Information
  enrollmentDate: {
    type: Date,
    required: [true, 'Enrollment date is required']
  },
  classroom: {
    type: String,
    required: [true, 'Classroom assignment is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  schedule: {
    monday: { startTime: String, endTime: String, isActive: { type: Boolean, default: false } },
    tuesday: { startTime: String, endTime: String, isActive: { type: Boolean, default: false } },
    wednesday: { startTime: String, endTime: String, isActive: { type: Boolean, default: false } },
    thursday: { startTime: String, endTime: String, isActive: { type: Boolean, default: false } },
    friday: { startTime: String, endTime: String, isActive: { type: Boolean, default: false } },
    saturday: { startTime: String, endTime: String, isActive: { type: Boolean, default: false } },
    sunday: { startTime: String, endTime: String, isActive: { type: Boolean, default: false } }
  },
  // Additional Information
  specialNeeds: {
    type: String,
    trim: true
  },
  dietaryRestrictions: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Fee Information
  monthlyFee: {
    type: Number,
    required: [true, 'Monthly fee is required'],
    min: [0, 'Monthly fee cannot be negative']
  },
  feeStatus: {
    type: String,
    enum: ['paid', 'pending', 'overdue'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for better query performance
childSchema.index({ parents: 1 });
childSchema.index({ teacher: 1 });
childSchema.index({ classroom: 1 });
childSchema.index({ isActive: 1 });

// Virtual for full name
childSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
childSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Ensure virtual fields are serialized
childSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Child', childSchema);
