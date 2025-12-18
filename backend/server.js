import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './src/config/database.js';
import errorHandler from './src/middleware/errorHandler.js';
import { initializeCronJobs } from './src/services/cronJobs.js';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import expenseRoutes from './src/routes/expenseRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import serviceHandlerRoutes from './src/routes/serviceHandlerRoutes.js';
import logRoutes from './src/routes/logRoutes.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/service-handler', serviceHandlerRoutes);
app.use('/api/logs', logRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Expense Management Ecosystem API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      expenses: '/api/expenses',
      notifications: '/api/notifications',
      serviceHandler: '/api/service-handler',
      logs: '/api/logs',
      health: '/api/health',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize cron jobs
initializeCronJobs();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

export default app;
