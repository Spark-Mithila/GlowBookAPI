const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// WhatsApp webhook - no auth middleware since WhatsApp calls this
router.all('/whatsapp', webhookController.handleWhatsAppWebhook);

module.exports = router;