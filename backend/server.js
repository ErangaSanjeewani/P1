const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const childrenRoutes = require('./routes/children');
const financeRoutes = require('./routes/finance');
const messageRoutes = require('./routes/messages');
const activityRoutes = require('./routes/activities');
const progressRoutes = require('./routes/progress');
const inventoryRoutes = require('./routes/inventory');
const calendarRoutes = require('./routes/calendar');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Daycare Management API is running',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/api/auth',
      '/api/users', 
      '/api/children',
      '/api/finance',
      '/api/messages',
      '/api/activities',
      '/api/progress',
      '/api/inventory',
      '/api/calendar'
    ]
  });
});

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API Health Check: http://localhost:${PORT}/api/health`);
  console.log('📋 Available API Routes:');
  console.log('   - Authentication: /api/auth');
  console.log('   - Users: /api/users');
  console.log('   - Children: /api/children');
  console.log('   - Finance: /api/finance');
  console.log('   - Messages: /api/messages');
  console.log('   - Activities: /api/activities');
  console.log('   - Progress: /api/progress');
  console.log('   - Inventory: /api/inventory');
  console.log('   - Calendar: /api/calendar');
});
