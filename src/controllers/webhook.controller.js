const { db } = require('../utils/firebase');
const whatsappService = require('../services/whatsapp.service');

/**
 * Webhook Controller
 */
class WebhookController {
  /**
   * Handle WhatsApp webhook
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async handleWhatsAppWebhook(req, res) {
    try {
      // Verify webhook if it's a GET request (needed for WhatsApp setup)
      if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        
        // Verify that the mode and token match
        // Note: Configure the WEBHOOK_VERIFY_TOKEN in your .env file
        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
          console.log('WhatsApp webhook verified');
          return res.status(200).send(challenge);
        } else {
          console.error('WhatsApp webhook verification failed');
          return res.sendStatus(403);
        }
      }

      // Handle POST request (incoming messages)
      const body = req.body;

      // Check if this is a WhatsApp message
      if (!body.object || !body.entry || !body.entry[0].changes) {
        return res.sendStatus(400);
      }

      const changes = body.entry[0].changes;
      
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        
        const value = change.value;
        if (!value || !value.messages || !value.messages.length) continue;
        
        // Process each message
        for (const message of value.messages) {
          await this.processMessage(message, value.metadata);
        }
      }

      // Return success response to WhatsApp
      return res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Error processing webhook'
      });
    }
  }

  /**
   * Process WhatsApp message
   * @param {object} message - Message object from WhatsApp
   * @param {object} metadata - Metadata from WhatsApp
   */
  async processMessage(message, metadata) {
    try {
      // Only process text messages for now
      if (message.type !== 'text' || !message.text || !message.text.body) {
        console.log('Ignoring non-text message');
        return;
      }

      const messageText = message.text.body;
      const fromNumber = message.from;
      
      console.log(`Received message from ${fromNumber}: ${messageText}`);

      // Parse message for appointment booking
      const bookingData = whatsappService.parseBookingMessage(messageText);
      
      if (!bookingData) {
        // Not a booking request, send help message
        await whatsappService.sendTextMessage(
          fromNumber,
          'To book an appointment, please send a message like: "Book Haircut on 2nd May 3PM"'
        );
        return;
      }

      // Find business profile that has this WhatsApp number registered
      const profileSnapshot = await db.collection('businessProfiles')
        .where('whatsappNumber', '==', metadata.phone_number_id)
        .limit(1)
        .get();

      if (profileSnapshot.empty) {
        console.error('No business found for WhatsApp number');
        await whatsappService.sendTextMessage(
          fromNumber,
          'Sorry, this number is not registered with any parlour.'
        );
        return;
      }

      const businessProfile = profileSnapshot.docs[0].data();
      const parlourId = profileSnapshot.docs[0].id;
      
      // Check if service exists
      const services = businessProfile.services || [];
      let matchingService = services.find(s => 
        s.name.toLowerCase() === bookingData.service.toLowerCase()
      );

      if (!matchingService) {
        // Try partial match
        matchingService = services.find(s => 
          s.name.toLowerCase().includes(bookingData.service.toLowerCase())
        );
      }

      if (!matchingService) {
        // Service not found
        const availableServices = services.map(s => s.name).join(', ');
        
        await whatsappService.sendTextMessage(
          fromNumber,
          `Sorry, we couldn't find the service "${bookingData.service}". Available services: ${availableServices || 'None'}`
        );
        return;
      }

      // Create appointment
      const appointmentData = {
        parlourId,
        businessName: businessProfile.businessName,
        customerName: `WhatsApp Customer (${fromNumber})`,
        customerPhone: fromNumber,
        serviceId: matchingService.id,
        serviceName: matchingService.name,
        appointmentDate: this.parseDate(bookingData.date),
        appointmentTime: bookingData.time,
        duration: matchingService.duration || 60,
        price: matchingService.price || 0,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: `Booked via WhatsApp with message: "${messageText}"`
      };

      // Save to Firestore
      const appointmentRef = await db.collection('appointments').add(appointmentData);

      // Send confirmation
      await whatsappService.sendAppointmentConfirmation(
        fromNumber,
        {
          customerName: appointmentData.customerName,
          serviceName: appointmentData.serviceName,
          date: appointmentData.appointmentDate,
          time: appointmentData.appointmentTime
        }
      );

      console.log(`Created appointment ${appointmentRef.id} from WhatsApp`);
    } catch (error) {
      console.error('Error processing message:', error);
      // Send error message to user
      if (message && message.from) {
        try {
          await whatsappService.sendTextMessage(
            message.from,
            'Sorry, we encountered an error processing your booking. Please try again or contact the parlour directly.'
          );
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    }
  }

  /**
   * Parse date string to ISO format
   * Simple implementation - in production, use a more robust library like date-fns
   * @param {string} dateStr - Date string from message
   * @returns {string} - ISO date string
   */
  parseDate(dateStr) {
    try {
      // Handle common formats like "2nd May", "May 2", "2/5/2023", etc.
      // This is a simplified implementation
      const months = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
      };

      let date;
      dateStr = dateStr.toLowerCase();

      // Try to parse with Date constructor first
      date = new Date(dateStr);
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // Try to parse formats like "2nd May"
      const dayMonthPattern = /(\d+)(?:st|nd|rd|th)?\s+([a-z]+)/;
      const dayMonthMatch = dateStr.match(dayMonthPattern);
      
      if (dayMonthMatch) {
        const day = parseInt(dayMonthMatch[1], 10);
        const monthName = dayMonthMatch[2].toLowerCase();
        
        if (months[monthName] !== undefined) {
          const month = months[monthName];
          const year = new Date().getFullYear();
          
          date = new Date(year, month, day);
          return date.toISOString().split('T')[0];
        }
      }

      // Try to parse formats like "May 2"
      const monthDayPattern = /([a-z]+)\s+(\d+)(?:st|nd|rd|th)?/;
      const monthDayMatch = dateStr.match(monthDayPattern);
      
      if (monthDayMatch) {
        const monthName = monthDayMatch[1].toLowerCase();
        const day = parseInt(monthDayMatch[2], 10);
        
        if (months[monthName] !== undefined) {
          const month = months[monthName];
          const year = new Date().getFullYear();
          
          date = new Date(year, month, day);
          return date.toISOString().split('T')[0];
        }
      }

      // Try to parse formats like "2/5" or "2/5/2023"
      const numericPattern = /(\d+)[\/\-](\d+)(?:[\/\-](\d+))?/;
      const numericMatch = dateStr.match(numericPattern);
      
      if (numericMatch) {
        let day, month, year;
        
        // Assume day/month format
        day = parseInt(numericMatch[1], 10);
        month = parseInt(numericMatch[2], 10) - 1; // Month is 0-indexed in JS
        
        // Check if year is provided
        if (numericMatch[3]) {
          year = parseInt(numericMatch[3], 10);
          // Handle 2-digit year
          if (year < 100) {
            year += 2000;
          }
        } else {
          year = new Date().getFullYear();
        }
        
        date = new Date(year, month, day);
        return date.toISOString().split('T')[0];
      }

      // If we can't parse, return today's date
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date().toISOString().split('T')[0];
    }
  }
}

module.exports = new WebhookController();