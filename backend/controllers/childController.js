const { validationResult } = require('express-validator');
const Child = require('../models/Child');
const User = require('../models/User');

// @desc    Get all children
// @route   GET /api/children
// @access  Private (Role-based)
const getChildren = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object based on user role
    let filter = {};
    
    if (req.user.role === 'parent') {
      // Parents can only see their own children
      filter.parents = req.user.id;
    } else if (req.user.role === 'teacher') {
      // Teachers can see children in their class
      filter.teacher = req.user.id;
    }
    // Admin and staff can see all children

    // Additional filters
    if (req.query.classroom) filter.classroom = req.query.classroom;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const children = await Child.find(filter)
      .populate('parents', 'firstName lastName email phone')
      .populate('teacher', 'firstName lastName email')
      .sort({ firstName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Child.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: children.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: children
    });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single child
// @route   GET /api/children/:id
// @access  Private (Role-based)
const getChild = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id)
      .populate('parents', 'firstName lastName email phone address')
      .populate('teacher', 'firstName lastName email phone');

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'parent' && !child.parents.some(parent => parent._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own children'
      });
    }

    if (req.user.role === 'teacher' && child.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view children in your class'
      });
    }

    res.status(200).json({
      success: true,
      data: child
    });
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new child
// @route   POST /api/children
// @access  Private (Admin, Teacher)
const createChild = async (req, res) => {
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

    const childData = {
      ...req.body,
      enrollmentDate: req.body.enrollmentDate || new Date()
    };

    const child = await Child.create(childData);

    // Update parent's children array
    if (child.parents && child.parents.length > 0) {
      await User.updateMany(
        { _id: { $in: child.parents } },
        { $addToSet: { children: child._id } }
      );
    }

    const populatedChild = await Child.findById(child._id)
      .populate('parents', 'firstName lastName email phone')
      .populate('teacher', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Child created successfully',
      data: populatedChild
    });
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during child creation'
    });
  }
};

// @desc    Update child
// @route   PUT /api/children/:id
// @access  Private (Admin, Teacher, Parent - limited)
const updateChild = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'parent' && !child.parents.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update your own children'
      });
    }

    if (req.user.role === 'teacher' && child.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update children in your class'
      });
    }

    // Define what each role can update
    let fieldsToUpdate = {};
    
    if (req.user.role === 'admin') {
      // Admin can update everything
      fieldsToUpdate = req.body;
    } else if (req.user.role === 'teacher') {
      // Teachers can update classroom info, notes, schedule
      const allowedFields = ['classroom', 'schedule', 'notes', 'specialNeeds', 'dietaryRestrictions'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          fieldsToUpdate[field] = req.body[field];
        }
      });
    } else if (req.user.role === 'parent') {
      // Parents can update limited info
      const allowedFields = ['emergencyContacts', 'medicalInfo', 'dietaryRestrictions', 'specialNeeds'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          fieldsToUpdate[field] = req.body[field];
        }
      });
    }

    const updatedChild = await Child.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).populate('parents', 'firstName lastName email phone')
     .populate('teacher', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Child updated successfully',
      data: updatedChild
    });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during child update'
    });
  }
};

// @desc    Delete child
// @route   DELETE /api/children/:id
// @access  Private (Admin only)
const deleteChild = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    // Remove child from parent's children array
    if (child.parents && child.parents.length > 0) {
      await User.updateMany(
        { _id: { $in: child.parents } },
        { $pull: { children: child._id } }
      );
    }

    await Child.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Child deleted successfully'
    });
  } catch (error) {
    console.error('Delete child error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during child deletion'
    });
  }
};

// @desc    Get children by classroom
// @route   GET /api/children/classroom/:classroom
// @access  Private
const getChildrenByClassroom = async (req, res) => {
  try {
    const { classroom } = req.params;
    
    let filter = { classroom, isActive: true };
    
    // Apply role-based filtering
    if (req.user.role === 'teacher') {
      filter.teacher = req.user.id;
    } else if (req.user.role === 'parent') {
      filter.parents = req.user.id;
    }

    const children = await Child.find(filter)
      .populate('parents', 'firstName lastName email phone')
      .populate('teacher', 'firstName lastName')
      .sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      count: children.length,
      data: children
    });
  } catch (error) {
    console.error('Get children by classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get child statistics
// @route   GET /api/children/stats
// @access  Private (Admin, Teacher)
const getChildStats = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'teacher') {
      filter.teacher = req.user.id;
    }

    const stats = await Child.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$classroom',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          averageAge: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$dateOfBirth'] },
                365.25 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      }
    ]);

    const totalChildren = await Child.countDocuments(filter);
    const activeChildren = await Child.countDocuments({ ...filter, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        total: totalChildren,
        active: activeChildren,
        inactive: totalChildren - activeChildren,
        byClassroom: stats
      }
    });
  } catch (error) {
    console.error('Get child stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getChildren,
  getChild,
  createChild,
  updateChild,
  deleteChild,
  getChildrenByClassroom,
  getChildStats
};
