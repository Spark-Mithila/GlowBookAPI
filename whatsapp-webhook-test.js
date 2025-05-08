/**
 * WhatsApp Webhook Testing Script
 * 
 * This script simulates incoming WhatsApp webhook messages for local testing.
 * Run this with Node.js to test your WhatsApp webhook handling.
 * 
 * Usage: node whatsapp-webhook-test.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const WEBHOOK_URL = 'http://localhost:4000/api/webhook/whatsapp'; // Your local webhook URL
const FROM_PHONE = '+919031285927'; // Test sender's phone number
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '15556453827'; // Your WhatsApp Phone Number ID

// Function to simulate a WhatsApp webhook call
async function simulateWebhookCall(messageType, messageContent) {
  try {
    // Create webhook payload based on message type
    let payload;
    
    switch (messageType) {
      case 'text':
        payload = createTextMessagePayload(messageContent);
        break;
      case 'button':
        payload = createButtonPayload(messageContent);
        break;
      case 'interactive':
        payload = createInteractivePayload(messageContent);
        break;
      default:
        console.error(`Unsupported message type: ${messageType}`);
        return;
    }
    
    // Make the POST request to your webhook
    console.log(`Sending ${messageType} message to webhook: "${messageContent}"`);
    const response = await axios.post(WEBHOOK_URL, payload);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error sending webhook payload:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
  }
}

// Create a text message payload
function createTextMessagePayload(text) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '12345',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550984141',
                phone_number_id: WHATSAPP_PHONE_NUMBER_ID
              },
              contacts: [
                {
                  profile: {
                    name: 'Test Customer'
                  },
                  wa_id: FROM_PHONE.replace('+', '')
                }
              ],
              messages: [
                {
                  from: FROM_PHONE,
                  id: 'wamid.test' + Date.now(),
                  timestamp: Math.floor(Date.now() / 1000),
                  text: {
                    body: text
                  },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };
}

// Create a button response payload
function createButtonPayload(buttonId) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '12345',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550984141',
                phone_number_id: WHATSAPP_PHONE_NUMBER_ID
              },
              contacts: [
                {
                  profile: {
                    name: 'Test Customer'
                  },
                  wa_id: FROM_PHONE.replace('+', '')
                }
              ],
              messages: [
                {
                  from: FROM_PHONE,
                  id: 'wamid.test' + Date.now(),
                  timestamp: Math.floor(Date.now() / 1000),
                  button: {
                    payload: buttonId,
                    text: 'Button Selection'
                  },
                  type: 'button'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };
}

// Create an interactive message payload (for list responses)
function createInteractivePayload(interactiveData) {
  // Parse the interactive data in format "type:id:title"
  const [interactiveType, id, title] = interactiveData.split(':');
  
  let interactiveObject;
  
  if (interactiveType === 'list') {
    interactiveObject = {
      list_reply: {
        id: id,
        title: title || 'Selected Item'
      }
    };
  } else if (interactiveType === 'button') {
    interactiveObject = {
      button_reply: {
        id: id,
        title: title || 'Button Pressed'
      }
    };
  } else {
    throw new Error(`Unsupported interactive type: ${interactiveType}`);
  }
  
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '12345',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550984141',
                phone_number_id: WHATSAPP_PHONE_NUMBER_ID
              },
              contacts: [
                {
                  profile: {
                    name: 'Test Customer'
                  },
                  wa_id: FROM_PHONE.replace('+', '')
                }
              ],
              messages: [
                {
                  from: FROM_PHONE,
                  id: 'wamid.test' + Date.now(),
                  timestamp: Math.floor(Date.now() / 1000),
                  interactive: interactiveObject,
                  type: 'interactive'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };
}

// Test function to run a series of tests
async function runTests() {
  // Test simple text message
  await simulateWebhookCall('text', 'Hello');
  
  // Test booking request
  await simulateWebhookCall('text', 'Book Haircut on 15th May 3 PM');
  
  // Test service list request
  await simulateWebhookCall('text', 'services');
  
  // Test working hours request
  await simulateWebhookCall('text', 'hours');
  
  // Test booking status request
  await simulateWebhookCall('text', 'status');
  
  // Test help command
  await simulateWebhookCall('text', 'help');
  
  // Test button response
  await simulateWebhookCall('button', 'BOOK_SERVICE_123456');
  
  // Test interactive list response
  await simulateWebhookCall('interactive', 'list:SERVICE_123456:Haircut');
  
  // Test interactive button response
  await simulateWebhookCall('interactive', 'button:CONFIRM_ABC123:Confirm');
  
  console.log('All test messages sent!');
}

// Function to simulate verification request
async function simulateVerification() {
  try {
    const verifyUrl = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${process.env.WEBHOOK_VERIFY_TOKEN}&hub.challenge=CHALLENGE_ACCEPTED`;
    
    console.log('Sending verification request...');
    const response = await axios.get(verifyUrl);
    
    console.log('Verification response status:', response.status);
    console.log('Verification response data:', response.data);
  } catch (error) {
    console.error('Error during verification:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
  }
}
// Add this new function to your whatsapp-webhook-test.js file

async function testTemplateMessage() {
  try {
    const axios = require('axios');
    require('dotenv').config();
    
    const WHATSAPP_API_URL = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    // This is your own phone number for testing
    const TEST_RECIPIENT = "+918340606816"; // Replace with your number
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: TEST_RECIPIENT,
      type: "template",
      template: {
        name: "appointment_confirmation", // Your exact template name
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Test Customer" },
              { type: "text", text: "Haircut" },
              { type: "text", text: "May 10, 2025" },
              { type: "text", text: "3:00 PM" }
            ]
          }
        ]
      }
    };
    
    const headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN2}`,
      'Content-Type': 'application/json'
    };
    
    console.log("Sending template message...");
    const response = await axios.post(WHATSAPP_API_URL, payload, { headers });
    
    console.log("Template message sent successfully!");
    console.log("Response:", response.data);
  } catch (error) {
    console.error("Error sending template message:", error.message);
    if (error.response) {
      console.error("Error response data:", error.response.data);
    }
  }
}

// Add this to your main function options
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Running all tests...');
    await runTests();
  } else if (args[0] === 'verify') {
    await simulateVerification();
  } else if (args[0] === 'text' && args[1]) {
    await simulateWebhookCall('text', args[1]);
  } else if (args[0] === 'button' && args[1]) {
    await simulateWebhookCall('button', args[1]);
  } else if (args[0] === 'interactive' && args[1]) {
    await simulateWebhookCall('interactive', args[1]);
  } else if (args[0] === 'template') {
    await testTemplateMessage();  // Add this line
  } else {
    console.log('Usage:');
    console.log('  node whatsapp-webhook-test.js                 # Run all tests');
    console.log('  node whatsapp-webhook-test.js verify          # Test verification');
    console.log('  node whatsapp-webhook-test.js text "message"  # Send text message');
    console.log('  node whatsapp-webhook-test.js button "id"     # Send button response');
    console.log('  node whatsapp-webhook-test.js interactive "type:id:title"  # Send interactive response');
    console.log('  node whatsapp-webhook-test.js template        # Test template message');  // Add this line
  }
}

// Run the main function
main().catch(console.error);