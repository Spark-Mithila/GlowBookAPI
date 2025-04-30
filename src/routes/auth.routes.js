const express = require('express');
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes (no auth required)
router.post('/register', authController.register);

// Protected routes (auth required)
router.get('/me', authMiddleware, authController.getCurrentUser);
router.patch('/profile', authMiddleware, authController.updateProfile);

module.exports = router;