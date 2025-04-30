const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authMiddleware, superadminMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes need authentication and superadmin role
router.use(authMiddleware);
router.use(superadminMiddleware);

// Admin routes
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/analytics', adminController.getAnalytics);

module.exports = router;