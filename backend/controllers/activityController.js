const { validationResult } = require('express-validator');
const Activity = require('../models/Activity');
const User = require('../models/User');
const Child = require('../models/Child');

// @desc    Get all activities
// @route   GET /api/activities
// @access  Private
const getActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'teacher') {
      filter.teacher = req.user.id;
    } else if (req.user.role === 'parent') {
      // Parents can see activities their children participate in
      const children = await Child.find({ parents: req.user.id }).select('_id');
      const childIds = children.map(child => child._id);
      filter.participants = { $in: childIds };
    }

    // Additional filters
    if (req.query.activityType) filter.activityType = req.query.activityType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.teacher) filter.teacher = req.query.teacher;
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
    }

    const activities = await Activity.find(filter)
      .populate('teacher', 'firstName lastName')
      .populate('assistants', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: activities.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single activity
// @route   GET /api/activities/:id
// @access  Private
const getActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('teacher', 'firstName lastName email')
      .populate('assistants', 'firstName lastName')
      .populate('participants', 'firstName lastName age')
      .populate('createdBy', 'firstName lastName');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'teacher' && activity.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own activities'
      });
    }

    if (req.user.role === 'parent') {
      const userChildren = await Child.find({ parents: req.user.id }).select('_id');
      const userChildIds = userChildren.map(child => child._id.toString());
      const activityChildIds = activity.participants.map(child => child._id.toString());
      
      const hasAccess = activityChildIds.some(childId => userChildIds.includes(childId));
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Your children are not participating in this activity'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new activity
// @route   POST /api/activities
// @access  Private (Admin, Teacher)
const createActivity = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const activityData = {
      ...req.body,
      createdBy: req.user.id
    };

    // If user is teacher and no teacher specified, assign to themselves
    if (req.user.role === 'teacher' && !activityData.teacher) {
      activityData.teacher = req.user.id;
    }

    // Validate teacher exists
    if (activityData.teacher) {
      const teacher = await User.findById(activityData.teacher);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({
          success: false,
          message: 'Invalid teacher specified'
        });
      }
    }

    // Validate assistants
    if (activityData.assistants && activityData.assistants.length > 0) {
      const assistants = await User.find({ 
        _id: { $in: activityData.assistants },
        role: { $in: ['teacher', 'staff'] }
      });
      
      if (assistants.length !== activityData.assistants.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more assistants are invalid'
        });
      }
    }

    // Validate participants
    if (activityData.participants && activityData.participants.length > 0) {
      const participants = await Child.find({ 
        _id: { $in: activityData.participants },
        isActive: true
      });
      
      if (participants.length !== activityData.participants.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more participants are invalid'
        });
      }

      // Check if exceeds max participants
      if (activityData.maxParticipants && participants.length > activityData.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Number of participants exceeds maximum allowed'
        });
      }
    }

    const activity = await Activity.create(activityData);

    const populatedActivity = await Activity.findById(activity._id)
      .populate('teacher', 'firstName lastName')
      .populate('assistants', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      data: populatedActivity
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during activity creation'
    });
  }
};

// @desc    Update activity
// @route   PUT /api/activities/:id
// @access  Private (Admin, Teacher - own activities)
const updateActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && activity.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own activities'
      });
    }

    // Validate participants if being updated
    if (req.body.participants) {
      const participants = await Child.find({ 
        _id: { $in: req.body.participants },
        isActive: true
      });
      
      if (participants.length !== req.body.participants.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more participants are invalid'
        });
      }

      // Check max participants
      const maxParticipants = req.body.maxParticipants || activity.maxParticipants;
      if (maxParticipants && participants.length > maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Number of participants exceeds maximum allowed'
        });
      }
    }

    const fieldsToUpdate = { ...req.body };
    delete fieldsToUpdate.createdBy; // Prevent changing creator

    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).populate('teacher', 'firstName lastName')
     .populate('assistants', 'firstName lastName')
     .populate('participants', 'firstName lastName')
     .populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      data: updatedActivity
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during activity update'
    });
  }
};

// @desc    Delete activity
// @route   DELETE /api/activities/:id
// @access  Private (Admin, Teacher - own activities)
const deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && activity.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own activities'
      });
    }

    // Don't allow deletion of completed activities (only admin can)
    if (activity.status === 'completed' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed activities'
      });
    }

    await Activity.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during activity deletion'
    });
  }
};

// @desc    Add participant to activity
// @route   POST /api/activities/:id/participants
// @access  Private (Admin, Teacher)
const addParticipant = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const { childId } = req.body;
    
    // Validate child
    const child = await Child.findById(childId);
    if (!child || !child.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Child not found or inactive'
      });
    }

    // Check if already participating
    if (activity.participants.includes(childId)) {
      return res.status(400).json({
        success: false,
        message: 'Child is already participating in this activity'
      });
    }

    // Check max participants
    if (activity.participants.length >= activity.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Activity has reached maximum participants'
      });
    }

    activity.participants.push(childId);
    await activity.save();

    const updatedActivity = await Activity.findById(activity._id)
      .populate('participants', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Participant added successfully',
      data: updatedActivity
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove participant from activity
// @route   DELETE /api/activities/:id/participants/:childId
// @access  Private (Admin, Teacher)
const removeParticipant = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const { childId } = req.params;

    // Check if child is participating
    if (!activity.participants.includes(childId)) {
      return res.status(400).json({
        success: false,
        message: 'Child is not participating in this activity'
      });
    }

    activity.participants = activity.participants.filter(
      participant => participant.toString() !== childId
    );
    await activity.save();

    res.status(200).json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get activity statistics
// @route   GET /api/activities/stats
// @access  Private (Admin, Teacher)
const getActivityStats = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'teacher') {
      filter.teacher = req.user.id;
    }

    const stats = await Activity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgParticipants: { $avg: { $size: '$participants' } }
        }
      }
    ]);

    const typeStats = await Activity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalActivities = await Activity.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        total: totalActivities,
        byStatus: stats,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  addParticipant,
  removeParticipant,
  getActivityStats
};
