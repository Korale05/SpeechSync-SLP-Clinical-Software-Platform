import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import http from 'http';
import authRoutes from './routes/auth.js';
import { initSocket } from './socket.js';
import patientRoutes from './routes/patients.js';
import sessionRoutes from './routes/sessions.js';
import assessmentRoutes from './routes/assessments.js';
import billingRoutes from './routes/billing.js';
import aiRoutes from './routes/ai.js';
import goalRoutes from './routes/goals.js';
import appointmentRoutes from './routes/appointments.js';
import messageRoutes from './routes/messages.js';
import exerciseRoutes from './routes/exercises.js';
import auditLogRoutes from './routes/auditLogs.js';
import reportRoutes from './routes/reports.js';
import teletherapyRoutes from './routes/teletherapy.js';
import iepRoutes from './routes/iep.js';
import userRoutes from './routes/users.js';
import invoiceRoutes from './routes/invoices.js';
import parentRoutes from './routes/parentRoutes.js';
import schoolRoutes from './routes/schoolRoutes.js';
import documentRoutes from './routes/documents.js';
dotenv.config();

// Enforce validation of JWT_SECRET and DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('FATAL ERROR: DATABASE_URL is not defined in the environment.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in the environment.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Set up rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit for auth endpoints
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    service: 'SpeechSync SLP Backend'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the SpeechSync SLP Clinical Platform API',
    status: 'online',
    endpoints: {
      status: '/api/status',
      auth: '/api/auth',
      patients: '/api/patients',
      sessions: '/api/sessions',
      assessments: '/api/assessments',
      billing: '/api/billing',
      ai: '/api/ai',
      appointments: '/api/appointments',
      messages: '/api/messages',
      exercises: '/api/exercises',
      'audit-logs': '/api/audit-logs',
      reports: '/api/reports',
      teletherapy: '/api/teletherapy'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/soap-notes', sessionRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/teletherapy', teletherapyRoutes);
app.use('/api/iep', iepRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api', invoiceRoutes);

const server = http.createServer(app);
initSocket(server);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`SpeechSync Backend Server running on port ${PORT}`);
});

