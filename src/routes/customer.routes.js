const express = require('express');
const customerController = require('../controllers/customer.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes need authentication
router.use(authMiddleware);

// Customer routes
router.get('/', customerController.getCustomers);
router.get('/:id/history', customerController.getCustomerHistory);
router.get('/phone/:phone/history', customerController.getCustomerHistoryByPhone);

module.exports = router;