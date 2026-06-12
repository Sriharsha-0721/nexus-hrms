import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import importRoutes from './routes/import.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leaves.js';
import payrollRoutes from './routes/payroll.js';
import departmentRoutes from './routes/departments.js';
import designationRoutes from './routes/designations.js';
import profileRequestRoutes from './routes/profileRequests.js';
import notificationRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';
import { connectDB } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for Vite frontend (allows both default ports)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/import', importRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/profile-requests', profileRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);

// Health Check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Nexus HRMS Server is running.' });
});

// Start Server & Connect Database
const startServer = async () => {
  try {
    // Attempt Database connection on startup
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Server failed to start due to database connection error.', err);
    process.exit(1);
  }
};

startServer();
