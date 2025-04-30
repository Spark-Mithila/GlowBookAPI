const express = require('express');
const profileController = require('../controllers/profile.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes need authentication
router.use(authMiddleware);

// Business profile routes
router.post('/', profileController.saveProfile);
router.get('/', profileController.getProfile);

// Service management
router.post('/services', profileController.saveService);
router.put('/services/:serviceId', profileController.saveService);
router.delete('/services/:serviceId', profileController.deleteService);

// Working hours
router.put('/working-hours', profileController.updateWorkingHours);

module.exports = router;