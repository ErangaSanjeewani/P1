const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: [true, 'Child is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  reportDate: {
    type: Date,
    required: [true, 'Report date is required'],
    default: Date.now
  },
  reportType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
    required: [true, 'Report type is required']
  },
  // Development areas
  developmentAreas: {
    cognitive: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      notes: String,
      milestones: [{
        description: String,
        achieved: Boolean,
        dateAchieved: Date
      }]
    },
    physical: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      notes: String,
      milestones: [{
        description: String,
        achieved: Boolean,
        dateAchieved: Date
      }]
    },
    social: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      notes: String,
      milestones: [{
        description: String,
        achieved: Boolean,
        dateAchieved: Date
      }]
    },
    emotional: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      notes: String,
      milestones: [{
        description: String,
        achieved: Boolean,
        dateAchieved: Date
      }]
    },
    language: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      notes: String,
      milestones: [{
        description: String,
        achieved: Boolean,
        dateAchieved: Date
      }]
    }
  },
  // Specific skills assessment
  skills: [{
    skillName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['motor', 'language', 'social', 'cognitive', 'self_care'],
      required: true
    },
    proficiencyLevel: {
      type: String,
      enum: ['emerging', 'developing', 'proficient', 'advanced'],
      required: true
    },
    notes: String
  }],
  // Behavioral observations
  behavior: {
    attention: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'needs_improvement']
    },
    participation: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'needs_improvement']
    },
    cooperation: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'needs_improvement']
    },
    followsDirections: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'needs_improvement']
    },
    notes: String
  },
  // Goals and recommendations
  goals: [{
    description: {
      type: String,
      required: true
    },
    targetDate: Date,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved'],
      default: 'not_started'
    },
    strategies: [String]
  }],
  recommendations: [{
    area: String,
    suggestion: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  // Overall assessment
  overallRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  summary: {
    type: String,
    required: [true, 'Summary is required'],
    maxlength: [1000, 'Summary cannot exceed 1000 characters']
  },
  // Parent communication
  sharedWithParents: {
    type: Boolean,
    default: false
  },
  parentFeedback: {
    type: String,
    maxlength: [500, 'Parent feedback cannot exceed 500 characters']
  },
  parentMeeting: {
    scheduled: Boolean,
    date: Date,
    notes: String
  }
}, {
  timestamps: true
});

// Index for better query performance
progressSchema.index({ child: 1, reportDate: -1 });
progressSchema.index({ teacher: 1 });
progressSchema.index({ reportType: 1 });
progressSchema.index({ sharedWithParents: 1 });

// Virtual for overall development score
progressSchema.virtual('overallDevelopmentScore').get(function() {
  const areas = this.developmentAreas;
  const total = areas.cognitive.rating + areas.physical.rating + 
                areas.social.rating + areas.emotional.rating + areas.language.rating;
  return (total / 5).toFixed(1);
});

// Ensure virtual fields are serialized
progressSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Progress', progressSchema);
