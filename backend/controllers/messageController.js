const Message = require('../models/Message');
const User = require('../models/User');
const Child = require('../models/Child');

// Get all messages for a user
exports.getMessages = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { page = 1, limit = 20, type, priority, isRead } = req.query;

    let query = {};

    // Based on user role, filter messages
    if (role === 'parent') {
      query.recipient = userId;
    } else if (role === 'teacher' || role === 'admin') {
      query.sender = userId;
    }

    // Additional filters
    if (type) query.messageType = type;
    if (priority) query.priority = priority;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('child', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    res.json({
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single message by ID
exports.getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName email role')
      .populate('recipient', 'firstName lastName email role')
      .populate('child', 'firstName lastName')
      .populate('parentMessage')
      .populate({
        path: 'replies',
        populate: {
          path: 'sender recipient',
          select: 'firstName lastName email role'
        }
      });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Mark as read if recipient is viewing
    if (req.user.userId === message.recipient._id.toString() && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send new message
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, child, subject, content, messageType, priority, parentMessage } = req.body;
    
    // Validate recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Validate child exists
    const childData = await Child.findById(child);
    if (!childData) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const message = new Message({
      sender: req.user.userId,
      recipient,
      child,
      subject,
      content,
      messageType: messageType || 'general',
      priority: priority || 'medium',
      parentMessage: parentMessage || null
    });

    const savedMessage = await message.save();
    
    // Populate the saved message for response
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('child', 'firstName lastName');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the recipient
    if (message.recipient.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({ message: 'Message marked as read', isRead: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.userId,
      isRead: false
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get messages by child
exports.getMessagesByChild = async (req, res) => {
  try {
    const { childId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({ child: childId })
      .populate('sender', 'firstName lastName email role')
      .populate('recipient', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({ child: childId });

    res.json({
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get conversation for a specific child
exports.getConversation = async (req, res) => {
  try {
    const { childId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Find messages related to this child
    const messages = await Message.find({ 
      child: childId,
      $or: [
        { sender: req.user.userId },
        { recipient: req.user.userId }
      ]
    })
      .populate('sender', 'firstName lastName email role')
      .populate('recipient', 'firstName lastName email role')
      .populate('child', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({ 
      child: childId,
      $or: [
        { sender: req.user.userId },
        { recipient: req.user.userId }
      ]
    });

    res.json({
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reply to message
exports.replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, priority } = req.body;

    // Find the original message
    const originalMessage = await Message.findById(id);
    if (!originalMessage) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    // Determine recipient (opposite of current user)
    const recipient = originalMessage.sender.toString() === req.user.userId 
      ? originalMessage.recipient 
      : originalMessage.sender;

    const reply = new Message({
      sender: req.user.userId,
      recipient,
      child: originalMessage.child,
      subject: `Re: ${originalMessage.subject}`,
      content,
      messageType: originalMessage.messageType,
      priority: priority || originalMessage.priority,
      parentMessage: originalMessage._id
    });

    const savedReply = await reply.save();
    
    const populatedReply = await Message.findById(savedReply._id)
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('child', 'firstName lastName');

    res.status(201).json(populatedReply);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is sender or recipient
    if (message.sender.toString() !== req.user.userId && message.recipient.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};