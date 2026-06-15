import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Validate essential environment variables on startup
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_SERVER',
  'DB_DATABASE'
];

if (process.env.OTP_MODE !== 'local') {
  requiredEnvVars.push('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD');
}

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`[FATAL] Missing required environment variables on startup: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enable security headers (with CSP disabled for React inline assets compatibility)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Enable compression for responses
app.use(compression());

// Enable CORS for Vite frontend (allows localhost on any port)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json());

// Simple request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

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

// Health Check route (returns application status and DB connectivity, used by Render health checks)
app.get('/api/health', async (req, res) => {
  const provider = process.env.DB_PROVIDER || 'mssql';
  try {
    const pool = await connectDB();
    let databaseVersion = 'Unknown';
    let activeSchema = 'Unknown';
    
    if (provider === 'postgres') {
      const versionRes = await pool.request().query('SELECT version() AS version, current_schema() AS schema');
      if (versionRes.recordset && versionRes.recordset.length > 0) {
        databaseVersion = versionRes.recordset[0].version;
        activeSchema = versionRes.recordset[0].schema;
      }
    } else {
      const versionRes = await pool.request().query('SELECT @@VERSION AS version, SCHEMA_NAME() AS schema');
      if (versionRes.recordset && versionRes.recordset.length > 0) {
        databaseVersion = versionRes.recordset[0].version;
        activeSchema = versionRes.recordset[0].schema;
      }
    }

    res.json({
      status: 'OK',
      message: 'Nexus HRMS Server is running.',
      database: {
        provider,
        connectionStatus: 'Connected',
        databaseVersion,
        activeSchema
      }
    });
  } catch (err) {
    console.error('[HEALTH CHECK ERROR] Database connection check failed:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Nexus HRMS Server is running but database connection failed.',
      database: {
        provider,
        connectionStatus: 'Disconnected',
        error: err.message
      }
    });
  }
});

// Database Health Check route
app.get('/api/health/database', async (req, res) => {
  const provider = process.env.DB_PROVIDER || 'mssql';
  try {
    const pool = await connectDB();
    let databaseVersion = 'Unknown';
    let activeSchema = 'Unknown';
    
    if (provider === 'postgres') {
      const versionRes = await pool.request().query('SELECT version() AS version, current_schema() AS schema');
      if (versionRes.recordset && versionRes.recordset.length > 0) {
        databaseVersion = versionRes.recordset[0].version;
        activeSchema = versionRes.recordset[0].schema;
      }
    } else {
      const versionRes = await pool.request().query('SELECT @@VERSION AS version, SCHEMA_NAME() AS schema');
      if (versionRes.recordset && versionRes.recordset.length > 0) {
        databaseVersion = versionRes.recordset[0].version;
        activeSchema = versionRes.recordset[0].schema;
      }
    }

    res.json({
      provider,
      connectionStatus: 'Connected',
      databaseVersion,
      activeSchema
    });
  } catch (err) {
    console.error('[DATABASE HEALTH ERROR]', err);
    res.status(500).json({
      provider,
      connectionStatus: 'Disconnected',
      databaseVersion: 'Unknown',
      activeSchema: 'Unknown',
      error: err.message
    });
  }
});

// Serve static assets in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../nexus-hrms/dist');
  app.use(express.static(distPath));
  
  // Catch-all route to serve SPA index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] Unhandled exception: ${err.message}`, err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
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
