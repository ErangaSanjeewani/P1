const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Admin only access
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Teacher or Admin access
const teacherOrAdmin = (req, res, next) => {
  if (!req.user || !['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Teacher or Admin access required'
    });
  }
  next();
};

// Parent access (can only access their own children's data)
const parentAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  // Admin can access everything
  if (req.user.role === 'admin') {
    return next();
  }

  // Parents can only access their own children's data
  if (req.user.role === 'parent') {
    // Check if the requested child belongs to this parent
    const childId = req.params.childId || req.params.id;
    if (childId && !req.user.children.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own children\'s data'
      });
    }
  }

  next();
};

// Finance Manager or Admin access
const financeAccess = (req, res, next) => {
  if (!req.user || !['finance', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Finance Manager or Admin access required'
    });
  }
  next();
};

// Check if user owns the resource or is admin
const ownerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const resourceUserId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'admin' || req.user._id.toString() === resourceUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: You can only access your own resources'
  });
};

module.exports = {
  protect,
  authorize,
  adminOnly,
  teacherOrAdmin,
  parentAccess,
  financeAccess,
  ownerOrAdmin
};
