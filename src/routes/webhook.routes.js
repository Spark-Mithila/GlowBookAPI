const express = require('express');
const router = express.Router();

/**
 * Handle WhatsApp webhook verification and incoming messages
 */
router.get('/whatsapp', (req, res) => {
  console.log('GET webhook request received for verification');
  console.log('Query params:', req.query);

  // Get verification parameters from the request
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_API_TOKEN;
  console.log(`Expected token: ${expectedToken}, Received token: ${token}`);

  // Check if mode and token are correct
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('WEBHOOK VERIFIED SUCCESSFULLY');
    // Respond with the challenge token from the request
    res.status(200).send(challenge);
  } else {
    // Respond with '403 Forbidden' if verify tokens do not match
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * Handle incoming webhook events (POST requests)
 */
router.post('/whatsapp', express.json(), (req, res) => {
  console.log('POST webhook event received');
  
  try {
    const body = req.body;
    
    // Log the incoming webhook payload
    console.log('Webhook payload:', JSON.stringify(body, null, 2));
    
    // Verify this is a WhatsApp Business Account event
    if (body.object !== 'whatsapp_business_account') {
      console.log(`Not a WhatsApp event: ${body.object}`);
      return res.sendStatus(404);
    }
    
    // Check that we have entries and changes
    if (!body.entry || !body.entry.length || !body.entry[0].changes || !body.entry[0].changes.length) {
      console.log('No valid entries or changes in webhook payload');
      return res.sendStatus(400);
    }
    
    // Process the webhook event asynchronously
    // We'll respond to WhatsApp immediately while we process in the background
    processWebhookEventAsync(body).catch(err => {
      console.error('Error processing webhook event:', err);
    });
    
    // Always respond with a 200 OK to acknowledge receipt of the webhook
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Error handling webhook:', error);
    // Still return 200 to prevent unnecessary retries
    res.status(200).send('EVENT_RECEIVED');
  }
});

/**
 * Process the webhook event asynchronously
 * This allows us to respond to WhatsApp quickly while processing takes place
 */
async function processWebhookEventAsync(body) {
  try {
    // Process each entry and change
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') {
          console.log(`Ignoring change for field: ${change.field}`);
          continue;
        }
        
        const value = change.value;
        if (!value || !value.messages || !value.messages.length) {
          console.log('No messages in this change');
          continue;
        }
        
        // Here you would call your webhook controller's processMessage method
        // For example:
        // const webhookController = require('../controllers/webhook.controller');
        // for (const message of value.messages) {
        //   await webhookController.processMessage(message, value.metadata);
        // }
        
        // For this simplified version, we'll just log the messages
        console.log(`Processing ${value.messages.length} messages`);
        for (const message of value.messages) {
          console.log('Message:', message);
        }
      }
    }
  } catch (error) {
    console.error('Error in async processing:', error);
  }
}

module.exports = router;