const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import routes
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const customerRoutes = require('./routes/customer.routes');
const adminRoutes = require('./routes/admin.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Initialize express app
const app = express();

// Apply middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  optionsSuccessStatus: 200
}));

// Important: The webhook route needs raw body for verification
// So we add the JSON body parser to all routes EXCEPT the webhook routes
app.use('/api/auth', express.json(), express.urlencoded({ extended: true }), authRoutes);
app.use('/api/profile', express.json(), express.urlencoded({ extended: true }), profileRoutes);
app.use('/api/appointments', express.json(), express.urlencoded({ extended: true }), appointmentRoutes);
app.use('/api/customers', express.json(), express.urlencoded({ extended: true }), customerRoutes);
app.use('/api/admin', express.json(), express.urlencoded({ extended: true }), adminRoutes);

// Special handling for webhook routes - NO body parser middleware here
// The webhook routes itself will handle JSON parsing as needed
app.use('/api/webhook', webhookRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'GlowbookAPI is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = app;