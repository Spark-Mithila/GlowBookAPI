const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes need authentication
router.use(authMiddleware);

// Appointment routes
router.get('/', appointmentController.getAppointments);
router.get('/:id', appointmentController.getAppointment);
router.post('/', appointmentController.createAppointment);
router.patch('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;