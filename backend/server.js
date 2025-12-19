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
import cronRoutes from './src/routes/cronRoutes.js';

console.log('Starting Expense Backend...');
// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());

const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Cloud Run health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/service-handler', serviceHandlerRoutes);
app.use('/api/logs', logRoutes);
app.use('/_cron', cronRoutes);

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

// Start server: bind immediately so Cloud Run sees the listener, then connect DB asynchronously.
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`);

  connectDB()
    .then(() => {
      console.log('MongoDB connected');
      initializeCronJobs();
    })
    .catch((err) => {
      console.error('MongoDB connection failed:', err.message);
      // Do not exit; allow container to keep serving health and retry later.
    });
});

// Handle unhandled promise rejections without killing the process
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

export default app;
