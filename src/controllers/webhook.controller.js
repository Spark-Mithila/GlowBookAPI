const { db } = require('../utils/firebase');
const whatsappService = require('../services/whatsapp.service');

/**
 * Webhook Controller for handling incoming WhatsApp messages
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
        if (mode === 'subscribe' &&     (token === process.env.WEBHOOK_VERIFY_TOKEN || 
            token === process.env.WHATSAPP_API_TOKEN)) {
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
      const fromNumber = message.from;
      
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

      // Process different message types
      switch (message.type) {
        case 'text':
          await this.processTextMessage(message, metadata, businessProfile, parlourId);
          break;
        case 'button':
          await this.processButtonMessage(message, metadata, businessProfile, parlourId);
          break;
        case 'interactive':
          await this.processInteractiveMessage(message, metadata, businessProfile, parlourId);
          break;
        default:
          // Handle unsupported message types
          await whatsappService.sendTextMessage(
            fromNumber,
            `I can help you book an appointment. Please send a message like: "Book Haircut on 2nd May 3PM" or "Book Haircut tomorrow at 2 PM"`
          );
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // Send error message to user
      if (message && message.from) {
        try {
          await whatsappService.sendTextMessage(
            message.from,
            'Sorry, we encountered an error processing your request. Please try again or contact the parlour directly.'
          );
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    }
  }

  /**
   * Process text messages
   * @param {object} message - Message object from WhatsApp
   * @param {object} metadata - Metadata from WhatsApp
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   */
  async processTextMessage(message, metadata, businessProfile, parlourId) {
    if (!message.text || !message.text.body) {
      console.log('Ignoring text message without body');
      return;
    }

    const messageText = message.text.body.trim();
    const fromNumber = message.from;
    
    console.log(`Received message from ${fromNumber}: ${messageText}`);

    // Check for command keywords
    const lowerText = messageText.toLowerCase();
    
    if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'hey') {
      // Send welcome message
      await this.sendWelcomeMessage(fromNumber, businessProfile);
      return;
    }
    
    if (lowerText === 'services' || lowerText === 'menu') {
      // Send services list
      await this.sendServicesList(fromNumber, businessProfile);
      return;
    }
    
    if (lowerText === 'hours' || lowerText === 'timing' || lowerText === 'timings') {
      // Send working hours
      await this.sendWorkingHours(fromNumber, businessProfile);
      return;
    }
    
    if (lowerText === 'status' || lowerText === 'my booking' || lowerText === 'my appointment') {
      // Check booking status
      await this.checkBookingStatus(fromNumber, parlourId);
      return;
    }
    
    if (lowerText === 'cancel') {
      // Handle cancellation request
      await this.handleCancellationRequest(fromNumber, parlourId);
      return;
    }
    
    if (lowerText === 'help') {
      // Send help message
      await this.sendHelpMessage(fromNumber, businessProfile);
      return;
    }

    // Check if this is a booking request
    const bookingData = this.parseBookingMessage(messageText);
    
    if (bookingData) {
      await this.handleBookingRequest(fromNumber, bookingData, businessProfile, parlourId, messageText);
    } else {
      // Not a recognized command or booking request
      await whatsappService.sendTextMessage(
        fromNumber,
        `Welcome to ${businessProfile.businessName}! 
You can type:
• "Book [service] on [date] [time]" to make an appointment
• "services" to see our services
• "hours" to check our working hours
• "status" to check your bookings
• "help" for more options`
      );
    }
  }

  /**
   * Process button messages
   * @param {object} message - Message object from WhatsApp
   * @param {object} metadata - Metadata from WhatsApp
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   */
  async processButtonMessage(message, metadata, businessProfile, parlourId) {
    if (!message.button || !message.button.payload) {
      console.log('Ignoring button message without payload');
      return;
    }

    const payload = message.button.payload;
    const fromNumber = message.from;
    
    // Handle different button payloads
    if (payload.startsWith('BOOK_SERVICE_')) {
      const serviceId = payload.replace('BOOK_SERVICE_', '');
      await this.handleServiceSelection(fromNumber, serviceId, businessProfile, parlourId);
    } else if (payload.startsWith('CANCEL_APPOINTMENT_')) {
      const appointmentId = payload.replace('CANCEL_APPOINTMENT_', '');
      await this.cancelAppointment(fromNumber, appointmentId, parlourId);
    } else if (payload === 'VIEW_SERVICES') {
      await this.sendServicesList(fromNumber, businessProfile);
    } else if (payload === 'VIEW_HOURS') {
      await this.sendWorkingHours(fromNumber, businessProfile);
    } else {
      await whatsappService.sendTextMessage(
        fromNumber,
        'Sorry, I couldn\'t process that selection. Please try again or type "help" for assistance.'
      );
    }
  }

  /**
   * Process interactive messages (lists, reply buttons)
   * @param {object} message - Message object from WhatsApp
   * @param {object} metadata - Metadata from WhatsApp
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   */
  async processInteractiveMessage(message, metadata, businessProfile, parlourId) {
    if (!message.interactive) {
      console.log('Ignoring interactive message without data');
      return;
    }

    const fromNumber = message.from;
    
    if (message.interactive.type === 'list_reply') {
      const selectedOption = message.interactive.list_reply.id;
      
      if (selectedOption.startsWith('SERVICE_')) {
        const serviceId = selectedOption.replace('SERVICE_', '');
        await this.handleServiceSelection(fromNumber, serviceId, businessProfile, parlourId);
      } else if (selectedOption.startsWith('DATE_')) {
        const date = selectedOption.replace('DATE_', '');
        await this.handleDateSelection(fromNumber, date, businessProfile, parlourId);
      } else if (selectedOption.startsWith('TIME_')) {
        const time = selectedOption.replace('TIME_', '');
        await this.handleTimeSelection(fromNumber, time, businessProfile, parlourId);
      }
    } else if (message.interactive.type === 'button_reply') {
      const selectedButton = message.interactive.button_reply.id;
      
      if (selectedButton.startsWith('CONFIRM_')) {
        const bookingRef = selectedButton.replace('CONFIRM_', '');
        await this.confirmBooking(fromNumber, bookingRef, businessProfile, parlourId);
      } else if (selectedButton.startsWith('CANCEL_')) {
        const bookingRef = selectedButton.replace('CANCEL_', '');
        await this.cancelBookingRequest(fromNumber, bookingRef);
      }
    }
  }

  /**
   * Send welcome message
   * @param {string} phone - Customer phone number
   * @param {object} businessProfile - Business profile data
   */
  async sendWelcomeMessage(phone, businessProfile) {
    await whatsappService.sendTextMessage(
      phone,
      `Welcome to ${businessProfile.businessName}! 
How can I help you today?
• Book an appointment
• View our services
• Check our working hours
• Check your booking status

Type "help" for more options.`
    );
  }

  /**
   * Send services list
   * @param {string} phone - Customer phone number
   * @param {object} businessProfile - Business profile data
   */
  async sendServicesList(phone, businessProfile) {
    const services = businessProfile.services || [];
    
    if (services.length === 0) {
      await whatsappService.sendTextMessage(
        phone,
        `${businessProfile.businessName} hasn't set up their services yet. Please contact them directly.`
      );
      return;
    }

    let message = `*Services at ${businessProfile.businessName}*\n\n`;
    
    services.forEach((service, index) => {
      message += `${index + 1}. *${service.name}*\n`;
      message += `   Duration: ${service.duration} mins\n`;
      message += `   Price: ₹${service.price}\n`;
      if (service.description) {
        message += `   ${service.description}\n`;
      }
      message += '\n';
    });
    
    message += 'To book, send a message like: "Book Haircut on 2nd May 3PM"';
    
    await whatsappService.sendTextMessage(phone, message);
  }

  /**
   * Send working hours
   * @param {string} phone - Customer phone number
   * @param {object} businessProfile - Business profile data
   */
  async sendWorkingHours(phone, businessProfile) {
    const workingHours = businessProfile.workingHours || {};
    
    if (Object.keys(workingHours).length === 0) {
      await whatsappService.sendTextMessage(
        phone,
        `${businessProfile.businessName} hasn't set up their working hours yet. Please contact them directly.`
      );
      return;
    }

    let message = `*Working Hours at ${businessProfile.businessName}*\n\n`;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      const dayHours = workingHours[day];
      
      if (dayHours) {
        if (dayHours.closed) {
          message += `*${day.charAt(0).toUpperCase() + day.slice(1)}*: Closed\n`;
        } else {
          message += `*${day.charAt(0).toUpperCase() + day.slice(1)}*: ${dayHours.open || '9:00 AM'} - ${dayHours.close || '6:00 PM'}\n`;
        }
      } else {
        message += `*${day.charAt(0).toUpperCase() + day.slice(1)}*: No information\n`;
      }
    });
    
    await whatsappService.sendTextMessage(phone, message);
  }

  /**
   * Check booking status
   * @param {string} phone - Customer phone number
   * @param {string} parlourId - Parlour ID
   */
  async checkBookingStatus(phone, parlourId) {
    try {
      // Format phone number
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      // Query for appointments
      const snapshot = await db.collection('appointments')
        .where('parlourId', '==', parlourId)
        .where('customerPhone', '==', formattedPhone)
        .where('status', 'in', ['scheduled', 'confirmed'])
        .orderBy('appointmentDate', 'asc')
        .orderBy('appointmentTime', 'asc')
        .limit(5)
        .get();
      
      if (snapshot.empty) {
        await whatsappService.sendTextMessage(
          phone,
          'You don\'t have any upcoming appointments. Would you like to book one?'
        );
        return;
      }
      
      let message = '*Your Upcoming Appointments*\n\n';
      
      snapshot.forEach(doc => {
        const appointment = doc.data();
        
        message += `*${appointment.serviceName}*\n`;
        message += `Date: ${appointment.appointmentDate}\n`;
        message += `Time: ${appointment.appointmentTime}\n`;
        message += `Status: ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}\n`;
        message += `Ref: ${doc.id.substring(0, 8)}\n\n`;
      });
      
      message += 'To cancel an appointment, type "cancel" followed by the reference number.';
      
      await whatsappService.sendTextMessage(phone, message);
    } catch (error) {
      console.error('Error checking booking status:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error checking your bookings. Please try again later.'
      );
    }
  }

  /**
   * Handle cancellation request
   * @param {string} phone - Customer phone number
   * @param {string} parlourId - Parlour ID
   */
  async handleCancellationRequest(phone, parlourId) {
    try {
      // Format phone number
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      // Query for appointments
      const snapshot = await db.collection('appointments')
        .where('parlourId', '==', parlourId)
        .where('customerPhone', '==', formattedPhone)
        .where('status', 'in', ['scheduled', 'confirmed'])
        .orderBy('appointmentDate', 'asc')
        .orderBy('appointmentTime', 'asc')
        .limit(5)
        .get();
      
      if (snapshot.empty) {
        await whatsappService.sendTextMessage(
          phone,
          'You don\'t have any upcoming appointments to cancel.'
        );
        return;
      }
      
      let message = 'To cancel, reply with "cancel" followed by the reference number:\n\n';
      
      snapshot.forEach(doc => {
        const appointment = doc.data();
        
        message += `*${appointment.serviceName}* on ${appointment.appointmentDate} at ${appointment.appointmentTime}\n`;
        message += `Ref: ${doc.id.substring(0, 8)}\n\n`;
      });
      
      message += 'Example: "cancel abc123de"';
      
      await whatsappService.sendTextMessage(phone, message);
    } catch (error) {
      console.error('Error handling cancellation request:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error. Please try again later.'
      );
    }
  }

  /**
   * Cancel an appointment
   * @param {string} phone - Customer phone number
   * @param {string} refCode - Appointment reference code
   * @param {string} parlourId - Parlour ID
   */
  async cancelAppointment(phone, refCode, parlourId) {
    try {
      // Format phone number
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      // Find all appointments for this parlour
      const snapshot = await db.collection('appointments').get();
      
      // Look for matching appointment by partial ID
      let appointmentDoc = null;
      let appointmentId = null;
      
      snapshot.forEach(doc => {
        if (doc.id.startsWith(refCode) && doc.data().parlourId === parlourId && doc.data().customerPhone === formattedPhone) {
          appointmentDoc = doc;
          appointmentId = doc.id;
        }
      });
      
      if (!appointmentDoc) {
        await whatsappService.sendTextMessage(
          phone,
          'Sorry, we couldn\'t find an appointment with that reference code. Please check and try again.'
        );
        return;
      }
      
      const appointment = appointmentDoc.data();
      
      // Check if the appointment is already cancelled
      if (appointment.status === 'cancelled') {
        await whatsappService.sendTextMessage(
          phone,
          'This appointment has already been cancelled.'
        );
        return;
      }
      
      // Cancel the appointment
      await db.collection('appointments').doc(appointmentId).update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
        notes: appointment.notes + '\nCancelled via WhatsApp by customer on ' + new Date().toISOString()
      });
      
      await whatsappService.sendTextMessage(
        phone,
        `Your appointment for ${appointment.serviceName} on ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled. Thank you for letting us know.`
      );
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error cancelling your appointment. Please try again later or contact the parlour directly.'
      );
    }
  }

  /**
   * Send help message
   * @param {string} phone - Customer phone number
   * @param {object} businessProfile - Business profile data
   */
  async sendHelpMessage(phone, businessProfile) {
    await whatsappService.sendTextMessage(
      phone,
      `*${businessProfile.businessName} Help*\n\n` +
      'Here are the commands you can use:\n\n' +
      '• "Book [service] on [date] [time]" - Make an appointment\n' +
      '• "services" - View our service menu\n' +
      '• "hours" - Check our working hours\n' +
      '• "status" - Check your booking status\n' +
      '• "cancel" - Cancel an appointment\n' +
      '• "help" - Show this help message\n\n' +
      `For direct assistance, please call ${businessProfile.phone || 'the salon'}.`
    );
  }

  /**
   * Parse incoming WhatsApp message for appointment booking
   * @param {string} message - Incoming message text
   * @returns {object|null} - Parsed appointment data or null if parsing failed
   */
  parseBookingMessage(message) {
    try {
      // Normalize the message
      const normalizedMessage = message.toLowerCase().trim();
      
      // Different parsing patterns
      
      // Pattern 1: "Book [service] on [date] [time]"
      // Example: "Book Haircut on 2nd May 3PM"
      const pattern1 = /book\s+(.+?)\s+on\s+(.+?)\s+(\d+(?::\d+)?(?:\s*[ap]m)?)/i;
      const match1 = message.match(pattern1);
      
      if (match1) {
        const [, service, dateStr, timeStr] = match1;
        return {
          service: service.trim(),
          date: dateStr.trim(),
          time: timeStr.trim(),
        };
      }
      
      // Pattern 2: "Book [service] tomorrow at [time]"
      // Example: "Book manicure tomorrow at 2:30 PM"
      const pattern2 = /book\s+(.+?)\s+(today|tomorrow|day after tomorrow)\s+(?:at\s+)?(\d+(?::\d+)?(?:\s*[ap]m)?)/i;
      const match2 = message.match(pattern2);
      
      if (match2) {
        const [, service, relativeDay, timeStr] = match2;
        
        // Convert relative day to date
        const today = new Date();
        let date = new Date(today);
        
        if (relativeDay.toLowerCase() === 'tomorrow') {
          date.setDate(today.getDate() + 1);
        } else if (relativeDay.toLowerCase() === 'day after tomorrow') {
          date.setDate(today.getDate() + 2);
        }
        
        const formattedDate = date.toISOString().split('T')[0];
        
        return {
          service: service.trim(),
          date: formattedDate,
          time: timeStr.trim(),
        };
      }
      
      // Pattern 3: "Book [service] for [date] at [time]"
      // Example: "Book haircut for next Monday at 11 AM"
      const pattern3 = /book\s+(.+?)\s+for\s+(.+?)\s+(?:at\s+)?(\d+(?::\d+)?(?:\s*[ap]m)?)/i;
      const match3 = message.match(pattern3);
      
      if (match3) {
        const [, service, dateStr, timeStr] = match3;
        
        return {
          service: service.trim(),
          date: this.parseDateExpression(dateStr.trim()),
          time: timeStr.trim(),
        };
      }
      
      // No match found
      return null;
    } catch (error) {
      console.error('Error parsing booking message:', error);
      return null;
    }
  }

  /**
   * Parse date expressions like "next Monday", "this Friday", etc.
   * @param {string} expression - Date expression
   * @returns {string} - ISO date string
   */
  parseDateExpression(expression) {
    const today = new Date();
    const lowerExpression = expression.toLowerCase();
    
    // Handle "next [day]" expressions
    const nextDayMatch = lowerExpression.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    if (nextDayMatch) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(nextDayMatch[1].toLowerCase());
      
      let daysToAdd = (targetDay + 7 - today.getDay()) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // Next week same day
      
      const date = new Date(today);
      date.setDate(today.getDate() + daysToAdd);
      
      return date.toISOString().split('T')[0];
    }
    
    // Handle "this [day]" expressions
    const thisDayMatch = lowerExpression.match(/this\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    if (thisDayMatch) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(thisDayMatch[1].toLowerCase());
      
      let daysToAdd = (targetDay - today.getDay() + 7) % 7;
      
      const date = new Date(today);
      date.setDate(today.getDate() + daysToAdd);
      
      return date.toISOString().split('T')[0];
    }
    
    // Try to parse with Date constructor
    const date = new Date(expression);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Fall back to existing parse logic
    return this.parseDate(expression);
  }

  /**
   * Handle booking request
   * @param {string} phone - Customer phone number
   * @param {object} bookingData - Parsed booking data
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   * @param {string} originalMessage - Original message text
   */
  async handleBookingRequest(phone, bookingData, businessProfile, parlourId, originalMessage) {
    try {
      const { service, date, time } = bookingData;

      // Format phone number
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      // Check if service exists
      const services = businessProfile.services || [];
      let matchingService = services.find(s => 
        s.name.toLowerCase() === service.toLowerCase()
      );

      if (!matchingService) {
        // Try partial match
        matchingService = services.find(s => 
          s.name.toLowerCase().includes(service.toLowerCase())
        );
      }

      if (!matchingService) {
        // Service not found
        const availableServices = services.map(s => s.name).join(', ');
        
        await whatsappService.sendTextMessage(
          phone,
          `Sorry, we couldn't find the service "${service}". Available services: ${availableServices || 'None'}`
        );
        return;
      }

      // Parse and validate date
      const parsedDate = this.parseDate(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const appointmentDate = new Date(parsedDate);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        await whatsappService.sendTextMessage(
          phone,
          'Sorry, you cannot book an appointment in the past. Please provide a future date.'
        );
        return;
      }

      // Create appointment
      const appointmentData = {
        parlourId,
        businessName: businessProfile.businessName,
        customerName: `WhatsApp Customer (${formattedPhone})`,
        customerPhone: formattedPhone,
        serviceId: matchingService.id,
        serviceName: matchingService.name,
        appointmentDate: parsedDate,
        appointmentTime: time,
        duration: matchingService.duration || 60,
        price: matchingService.price || 0,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: `Booked via WhatsApp with message: "${originalMessage}"`
      };

      // Save to Firestore
      const appointmentRef = await db.collection('appointments').add(appointmentData);

      // Send confirmation
      await whatsappService.sendAppointmentConfirmation(
        phone,
        {
          customerName: appointmentData.customerName,
          serviceName: appointmentData.serviceName,
          date: appointmentData.appointmentDate,
          time: appointmentData.appointmentTime
        }
      );

      console.log(`Created appointment ${appointmentRef.id} from WhatsApp`);
    } catch (error) {
      console.error('Error handling booking request:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error processing your booking. Please try again with a different format like "Book Haircut on 2nd May 3PM" or contact the parlour directly.'
      );
    }
  }

  /**
   * Parse date string to ISO format
   * @param {string} dateStr - Date string from message
   * @returns {string} - ISO date string
   */
  parseDate(dateStr) {
    try {
      // Handle relative dates
      const lowerDateStr = dateStr.toLowerCase();
      const today = new Date();
      
      if (lowerDateStr === 'today') {
        return today.toISOString().split('T')[0];
      }
      
      if (lowerDateStr === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }
      
      if (lowerDateStr === 'day after tomorrow') {
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        return dayAfter.toISOString().split('T')[0];
      }

      // Handle common formats like "2nd May", "May 2", "2/5/2023", etc.
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

      // Try to parse with Date constructor first
      let date;
      const lowerCaseDateStr = dateStr.toLowerCase();

      // Try to parse with Date constructor first
      date = new Date(dateStr);
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // Try to parse formats like "2nd May"
      const dayMonthPattern = /(\d+)(?:st|nd|rd|th)?\s+([a-z]+)/;
      const dayMonthMatch = lowerCaseDateStr.match(dayMonthPattern);
      
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
      const monthDayMatch = lowerCaseDateStr.match(monthDayPattern);
      
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
      const numericMatch = lowerCaseDateStr.match(numericPattern);
      
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
  
  /**
   * Handle service selection
   * @param {string} phone - Customer phone number
   * @param {string} serviceId - Selected service ID
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   */
  async handleServiceSelection(phone, serviceId, businessProfile, parlourId) {
    try {
      const services = businessProfile.services || [];
      const service = services.find(s => s.id === serviceId);
      
      if (!service) {
        await whatsappService.sendTextMessage(
          phone,
          'Sorry, that service is no longer available. Please check our current services by typing "services".'
        );
        return;
      }
      
      // Store the selection in session
      // Note: In a real implementation, you would store this in a database or cache
      // For simplicity, we'll use temporary storage or a more sophisticated solution

      // For now, prompt for date
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      // Format dates
      const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      };
      
      await whatsappService.sendTextMessage(
        phone,
        `You've selected: *${service.name}*\n\nPlease reply with your preferred date:\n• Today (${formatDate(today)})\n• Tomorrow (${formatDate(tomorrow)})\n• ${formatDate(dayAfter)}\n• Next week\n\nOr type a specific date like "15th May"`
      );
    } catch (error) {
      console.error('Error handling service selection:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error processing your selection. Please try again later.'
      );
    }
  }
  
  /**
   * Handle date selection
   * @param {string} phone - Customer phone number
   * @param {string} dateStr - Selected date string
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   */
  async handleDateSelection(phone, dateStr, businessProfile, parlourId) {
    try {
      const parsedDate = this.parseDate(dateStr);
      
      // Store the selection
      // In a real implementation, store this in a database
      
      // Prompt for time
      await whatsappService.sendTextMessage(
        phone,
        `You've selected: *${parsedDate}*\n\nPlease reply with your preferred time:\n• Morning (9 AM - 12 PM)\n• Afternoon (12 PM - 4 PM)\n• Evening (4 PM - 8 PM)\n\nOr type a specific time like "3:30 PM"`
      );
    } catch (error) {
      console.error('Error handling date selection:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error processing your date selection. Please try again with a different format.'
      );
    }
  }

  /**
   * Handle time selection
   * @param {string} phone - Customer phone number
   * @param {string} timeStr - Selected time string
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   */
  async handleTimeSelection(phone, timeStr, businessProfile, parlourId) {
    try {
      // Normally, you would retrieve the stored service and date from your database
      // For this example, we'll just acknowledge the time selection
      
      await whatsappService.sendTextMessage(
        phone,
        `You've selected: *${timeStr}*\n\nWould you like to confirm this booking? Reply with "yes" to confirm or "no" to start over.`
      );
    } catch (error) {
      console.error('Error handling time selection:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error processing your time selection. Please try again with a different format.'
      );
    }
  }

  /**
   * Confirm booking
   * @param {string} phone - Customer phone number
   * @param {string} bookingRef - Booking reference
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID 
   */
  async confirmBooking(phone, bookingRef, businessProfile, parlourId) {
    try {
      // In a real implementation, retrieve the pending booking from the database
      
      // Update status to confirmed
      const appointmentRef = db.collection('appointments').doc(bookingRef);
      const appointmentDoc = await appointmentRef.get();
      
      if (!appointmentDoc.exists) {
        await whatsappService.sendTextMessage(
          phone,
          'Sorry, we couldn\'t find your booking. Please try again.'
        );
        return;
      }
      
      const appointment = appointmentDoc.data();
      
      await appointmentRef.update({
        status: 'confirmed',
        updatedAt: new Date().toISOString()
      });
      
      await whatsappService.sendTextMessage(
        phone,
        `Your booking has been confirmed!\n\n*Booking Details*\nService: ${appointment.serviceName}\nDate: ${appointment.appointmentDate}\nTime: ${appointment.appointmentTime}\n\nWe look forward to seeing you!`
      );
    } catch (error) {
      console.error('Error confirming booking:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error confirming your booking. Please try again later or contact the parlour directly.'
      );
    }
  }

  /**
   * Cancel booking request
   * @param {string} phone - Customer phone number
   * @param {string} bookingRef - Booking reference
   */
  async cancelBookingRequest(phone, bookingRef) {
    try {
      // In a real implementation, you would retrieve and delete the pending booking
      
      await whatsappService.sendTextMessage(
        phone,
        'Your booking request has been cancelled. You can start a new booking anytime.'
      );
    } catch (error) {
      console.error('Error cancelling booking request:', error);
      await whatsappService.sendTextMessage(
        phone,
        'Sorry, we encountered an error cancelling your booking request. Please try again later.'
      );
    }
  }
}