const axios = require('axios');
require('dotenv').config();

/**
 * Service to handle WhatsApp API interactions
 * Implements all message templates and API calls for GlowbookAPI
 */
class WhatsAppService {
  constructor() {
    this.apiUrl = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    this.headers = {
      'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Send a text message to a WhatsApp number
   * @param {string} to - Recipient's phone number with country code
   * @param {string} message - Text message to send
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendTextMessage(to, message) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('WhatsApp message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  /**
   * Send appointment confirmation using template
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendAppointmentConfirmation(to, appointmentData) {
    try {
      const { customerName, serviceName, date, time } = appointmentData;
      
      // Format date for better readability
      let formattedDate = this.formatDateForDisplay(date);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'appointment_confirmation',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: serviceName },
                { type: 'text', text: formattedDate },
                { type: 'text', text: time }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('Appointment confirmation sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending appointment confirmation:', error.response?.data || error.message);
      
      // Fallback to text message if template fails
      try {
        return await this.sendAppointmentConfirmationFallback(to, appointmentData);
      } catch (fallbackError) {
        console.error('Error sending fallback appointment confirmation:', fallbackError);
        throw new Error('Failed to send appointment confirmation');
      }
    }
  }

  /**
   * Fallback text message for appointment confirmation
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendAppointmentConfirmationFallback(to, appointmentData) {
    const { customerName, serviceName, date, time } = appointmentData;
    let formattedDate = this.formatDateForDisplay(date);
    
    const message = `Hello ${customerName}! 

Your appointment for ${serviceName} has been confirmed for ${formattedDate} at ${time}. 

We're looking forward to seeing you. If you need to reschedule, please reply to this message or call us.

Thank you for choosing our services!`;
    
    return await this.sendTextMessage(to, message);
  }

  /**
   * Send appointment reminder using template
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendAppointmentReminder(to, appointmentData) {
    try {
      const { customerName, serviceName, date, time } = appointmentData;
      
      // Format date for better readability
      let formattedDate = this.formatDateForDisplay(date);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'appointment_reminder',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: serviceName },
                { type: 'text', text: formattedDate },
                { type: 'text', text: time }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('Appointment reminder sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending appointment reminder:', error.response?.data || error.message);
      
      // Fallback to text message if template fails
      try {
        return await this.sendAppointmentReminderFallback(to, appointmentData);
      } catch (fallbackError) {
        console.error('Error sending fallback appointment reminder:', fallbackError);
        throw new Error('Failed to send appointment reminder');
      }
    }
  }

  /**
   * Fallback text message for appointment reminder
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendAppointmentReminderFallback(to, appointmentData) {
    const { customerName, serviceName, date, time } = appointmentData;
    let formattedDate = this.formatDateForDisplay(date);
    
    const message = `Hi ${customerName}!

This is a reminder about your upcoming ${serviceName} appointment tomorrow, ${formattedDate} at ${time}.

We're looking forward to seeing you! Reply with CONFIRM to confirm your appointment or RESCHEDULE if you need to change it.`;
    
    return await this.sendTextMessage(to, message);
  }

  /**
   * Send appointment cancellation using template
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   * @param {string} businessPhone - Business phone number
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendAppointmentCancellation(to, appointmentData, businessPhone) {
    try {
      const { customerName, serviceName, date, time } = appointmentData;
      
      // Format date for better readability
      let formattedDate = this.formatDateForDisplay(date);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'appointment_cancellation',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: serviceName },
                { type: 'text', text: formattedDate },
                { type: 'text', text: time },
                { type: 'text', text: businessPhone }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('Appointment cancellation sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending appointment cancellation:', error.response?.data || error.message);
      
      // Fallback to text message if template fails
      try {
        return await this.sendAppointmentCancellationFallback(to, appointmentData, businessPhone);
      } catch (fallbackError) {
        console.error('Error sending fallback appointment cancellation:', fallbackError);
        throw new Error('Failed to send appointment cancellation');
      }
    }
  }

  /**
   * Fallback text message for appointment cancellation
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   * @param {string} businessPhone - Business phone number
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendAppointmentCancellationFallback(to, appointmentData, businessPhone) {
    const { customerName, serviceName, date, time } = appointmentData;
    let formattedDate = this.formatDateForDisplay(date);
    
    const message = `Hello ${customerName},

We're sorry to inform you that your appointment for ${serviceName} on ${formattedDate} at ${time} has been cancelled.

Please contact us at ${businessPhone} to reschedule or for any questions.

We apologize for any inconvenience.`;
    
    return await this.sendTextMessage(to, message);
  }

  /**
   * Send welcome message to a new user
   * @param {string} to - Recipient's phone number with country code
   * @param {string} businessName - Business name
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendWelcomeMessage(to, businessName) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'welcome_message',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: businessName }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('Welcome message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending welcome message:', error.response?.data || error.message);
      
      // Fallback to text message
      const message = `Welcome to ${businessName}! 

Thank you for connecting with us on WhatsApp. You can use this chat to:

• Book new appointments
• Reschedule existing appointments
• Get information about our services
• Check our working hours

To book an appointment, simply message us in this format:
"Book [service] on [date] [time]"

Example: "Book Haircut on 15th May 2PM"

Need assistance? Just reply to this message and we'll help you!`;
      
      return await this.sendTextMessage(to, message);
    }
  }

  /**
   * Send booking help information
   * @param {string} to - Recipient's phone number with country code
   * @param {string} businessName - Business name
   * @param {string} servicesList - Comma-separated list of services
   * @param {string} workingHours - Working hours information
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendBookingHelp(to, businessName, servicesList, workingHours) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'booking_help',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: businessName },
                { type: 'text', text: servicesList },
                { type: 'text', text: workingHours }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('Booking help sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending booking help:', error.response?.data || error.message);
      
      // Fallback to text message
      const message = `Hello from ${businessName}!

To book an appointment with us, please send a message in this format:
"Book [service name] on [date] [time]"

For example: "Book Haircut on 10th May 3PM"

Our available services are:
${servicesList}

Our working hours are:
${workingHours}

Need help? Reply HELP for assistance.`;
      
      return await this.sendTextMessage(to, message);
    }
  }

  /**
   * Send service availability information
   * @param {string} to - Recipient's phone number with country code
   * @param {object} availabilityData - Availability information
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendServiceAvailability(to, availabilityData) {
    try {
      const { customerName, serviceName, date, availableSlots } = availabilityData;
      
      // Format date for better readability
      let formattedDate = this.formatDateForDisplay(date);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'service_availability',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: serviceName },
                { type: 'text', text: formattedDate },
                { type: 'text', text: availableSlots }
              ]
            }
          ]
        }
      };

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('Service availability sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending service availability:', error.response?.data || error.message);
      
      // Fallback to text message
      const { customerName, serviceName, date, availableSlots } = availabilityData;
      let formattedDate = this.formatDateForDisplay(date);
      
      const message = `Hello ${customerName},

We've checked the availability for ${serviceName} on ${formattedDate}.

Available time slots:
${availableSlots}

To book, please reply with your preferred time.`;
      
      return await this.sendTextMessage(to, message);
    }
  }

  /**
   * Send a message with reply buttons
   * @param {string} to - Recipient's phone number with country code
   * @param {string} bodyText - Body text
   * @param {Array} buttons - Array of button objects with id and title
   * @param {string} headerText - Header text (optional)
   * @param {string} footerText - Footer text (optional)
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendButtonMessage(to, bodyText, buttons, headerText = null, footerText = null) {
    try {
      // Ensure we don't exceed the limit of 3 buttons
      const buttonList = buttons.slice(0, 3);
      
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText
          },
          action: {
            buttons: buttonList.map(button => ({
              type: 'reply',
              reply: {
                id: button.id,
                title: button.title.slice(0, 20) // Max 20 characters
              }
            }))
          }
        }
      };
      
      // Add header if provided
      if (headerText) {
        payload.interactive.header = {
          type: 'text',
          text: headerText
        };
      }
      
      // Add footer if provided
      if (footerText) {
        payload.interactive.footer = {
          text: footerText
        };
      }

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('WhatsApp button message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp button message:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp button message');
    }
  }

  /**
   * Send a message with a list
   * @param {string} to - Recipient's phone number with country code
   * @param {string} bodyText - Body text
   * @param {string} buttonText - Text on the button that opens the list
   * @param {Array} sections - Array of section objects with title and rows
   * @param {string} headerText - Header text (optional)
   * @param {string} footerText - Footer text (optional)
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendListMessage(to, bodyText, buttonText, sections, headerText = null, footerText = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: bodyText
          },
          action: {
            button: buttonText,
            sections: sections
          }
        }
      };
      
      // Add header if provided
      if (headerText) {
        payload.interactive.header = {
          type: 'text',
          text: headerText
        };
      }
      
      // Add footer if provided
      if (footerText) {
        payload.interactive.footer = {
          text: footerText
        };
      }

      const response = await axios.post(this.apiUrl, payload, { headers: this.headers });
      console.log('WhatsApp list message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp list message:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp list message');
    }
  }

  /**
   * Send a service list message with interactive buttons or list
   * @param {string} to - Recipient's phone number with country code
   * @param {Array} services - Array of service objects
   * @param {string} businessName - Business name
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendServicesListInteractive(to, services, businessName) {
    try {
      // If no services, send text message
      if (!services || services.length === 0) {
        return await this.sendTextMessage(
          to,
          `${businessName} hasn't set up their services yet. Please contact them directly.`
        );
      }

      // Prepare sections for list message
      const sections = [];
      const servicesSection = {
        title: "Available Services",
        rows: []
      };

      // Add each service as a row (up to 10 services, WhatsApp limit)
      services.slice(0, 10).forEach(service => {
        servicesSection.rows.push({
          id: `SERVICE_${service.id}`,
          title: service.name,
          description: `${service.duration} mins - ₹${service.price}`
        });
      });

      sections.push(servicesSection);

      // Send the list message
      return await this.sendListMessage(
        to,
        `Here are the services offered by ${businessName}. Select one to book:`,
        "View Services",
        sections,
        "Our Services",
        "Tap a service to view details and book"
      );
    } catch (error) {
      console.error('Error sending interactive services list:', error);
      
      // Fallback to text message
      return await this.sendServicesList(to, services, businessName);
    }
  }

  /**
   * Send a text-based services list (fallback)
   * @param {string} to - Recipient's phone number with country code
   * @param {Array} services - Array of service objects
   * @param {string} businessName - Business name
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendServicesList(to, services, businessName) {
    if (!services || services.length === 0) {
      return await this.sendTextMessage(
        to,
        `${businessName} hasn't set up their services yet. Please contact them directly.`
      );
    }

    let message = `*Services at ${businessName}*\n\n`;
    
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
    
    return await this.sendTextMessage(to, message);
  }

  /**
   * Format working hours for message
   * @param {object} workingHours - Working hours object
   * @returns {string} - Formatted working hours text
   */
  formatWorkingHours(workingHours) {
    if (!workingHours || Object.keys(workingHours).length === 0) {
      return "Not available";
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let result = '';
    
    days.forEach(day => {
      const dayHours = workingHours[day];
      if (dayHours) {
        if (dayHours.closed) {
          result += `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
        } else {
          result += `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.open || '9:00 AM'} - ${dayHours.close || '6:00 PM'}\n`;
        }
      }
    });
    
    return result || "Not available";
  }

  /**
   * Format services for message
   * @param {Array} services - Array of service objects
   * @returns {string} - Formatted services list text
   */
  formatServicesList(services) {
    if (!services || services.length === 0) {
      return "No services available";
    }
    
    return services.map(s => s.name).join(', ');
  }

  /**
   * Format date for display
   * @param {string} dateStr - Date string in any format
   * @returns {string} - Formatted date string
   */
  formatDateForDisplay(dateStr) {
    try {
      // Handle relative dates
      const lowerDateStr = typeof dateStr === 'string' ? dateStr.toLowerCase() : '';
      const today = new Date();
      
      if (lowerDateStr === 'today') {
        return today.toLocaleDateString('en', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      }
      
      if (lowerDateStr === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toLocaleDateString('en', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      }
      
      if (lowerDateStr === 'day after tomorrow') {
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        return dayAfter.toLocaleDateString('en', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      }

      // Handle date objects or date strings
      let dateObj;
      
      if (dateStr instanceof Date) {
        dateObj = dateStr;
      } else if (typeof dateStr === 'string') {
        if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateObj = new Date(dateStr);
        } else {
          // Try to parse complex date strings
          dateObj = this.parseComplexDate(dateStr);
        }
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // If all else fails, return the original string
      return dateStr;
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return dateStr; // Return the original string if there's an error
    }
  }

  /**
   * Parse complex date formats
   * @param {string} dateStr - Date string in any format
   * @returns {Date|null} - Date object or null if parsing failed
   */
  parseComplexDate(dateStr) {
    try {
      const today = new Date();
      const lowerCaseDateStr = dateStr.toLowerCase();
      
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

      // Try to parse formats like "2nd May"
      const dayMonthPattern = /(\d+)(?:st|nd|rd|th)?\s+([a-z]+)/;
      const dayMonthMatch = lowerCaseDateStr.match(dayMonthPattern);
      
      if (dayMonthMatch) {
        const day = parseInt(dayMonthMatch[1], 10);
        const monthName = dayMonthMatch[2].toLowerCase();
        
        if (months[monthName] !== undefined) {
          const month = months[monthName];
          const year = today.getFullYear();
          
          return new Date(year, month, day);
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
          const year = today.getFullYear();
          
          return new Date(year, month, day);
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
          year = today.getFullYear();
        }
        
        return new Date(year, month, day);
      }
      
      // Handle "next [day]" expressions
      const nextDayMatch = lowerCaseDateStr.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
      if (nextDayMatch) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.indexOf(nextDayMatch[1].toLowerCase());
        
        let daysToAdd = (targetDay + 7 - today.getDay()) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // Next week same day
        
        const date = new Date(today);
        date.setDate(today.getDate() + daysToAdd);
        
        return date;
      }
      
      // Try one last attempt with Date constructor
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing complex date:', error);
      return null;
    }
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
          date: dateStr.trim(),
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
   * Process WhatsApp message for commands and booking requests
   * @param {string} messageText - Message text
   * @param {string} fromNumber - Sender's phone number
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   * @returns {Promise<void>}
   */
  async processTextMessage(messageText, fromNumber, businessProfile, parlourId) {
    // Check for command keywords
    const lowerText = messageText.toLowerCase().trim();
    
    if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'hey') {
      // Send welcome message
      await this.sendWelcomeMessage(fromNumber, businessProfile.businessName);
      return;
    }
    
    if (lowerText === 'services' || lowerText === 'menu') {
      // Send services list
      await this.sendServicesListInteractive(fromNumber, businessProfile.services, businessProfile.businessName);
      return;
    }
    
    if (lowerText === 'hours' || lowerText === 'timing' || lowerText === 'timings') {
      // Send working hours
      const workingHoursText = this.formatWorkingHours(businessProfile.workingHours);
      await this.sendTextMessage(
        fromNumber,
        `*Working Hours at ${businessProfile.businessName}*\n\n${workingHoursText}`
      );
      return;
    }
    
    if (lowerText === 'status' || lowerText === 'my booking' || lowerText === 'my appointment') {
      // Check booking status - to be implemented based on your database query
      await this.checkBookingStatus(fromNumber, parlourId);
      return;
    }
    
    // Check if this is a cancellation request
    if (lowerText.startsWith('cancel')) {
      const refCode = lowerText.replace('cancel', '').trim();
      if (refCode) {
        await this.cancelAppointment(fromNumber, refCode, parlourId);
      } else {
        await this.handleCancellationRequest(fromNumber, parlourId);
      }
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
      await this.sendTextMessage(
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
   * Check booking status for a customer
   * @param {string} phone - Customer phone number
   * @param {string} parlourId - Parlour ID
   * @returns {Promise<void>}
   */
  async checkBookingStatus(phone, parlourId) {
    try {
      // This would make a database query - using mock output for now
      const message = '*Your Upcoming Appointments*\n\n' +
        'You don\'t have any upcoming appointments. Would you like to book one?';
      
      await this.sendTextMessage(phone, message);
    } catch (error) {
      console.error('Error checking booking status:', error);
      await this.sendTextMessage(
        phone,
        'Sorry, we encountered an error checking your bookings. Please try again later.'
      );
    }
  }

  /**
   * Handle cancellation request
   * @param {string} phone - Customer phone number
   * @param {string} parlourId - Parlour ID 
   * @returns {Promise<void>}
   */
  async handleCancellationRequest(phone, parlourId) {
    try {
      // This would make a database query - using mock output for now
      const message = 'To cancel, reply with "cancel" followed by the reference number:\n\n' +
        'Example: "cancel abc123de"';
      
      await this.sendTextMessage(phone, message);
    } catch (error) {
      console.error('Error handling cancellation request:', error);
      await this.sendTextMessage(
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
   * @returns {Promise<void>}
   */
  async cancelAppointment(phone, refCode, parlourId) {
    try {
      // This would make a database query and update - using mock output for now
      const message = 'Your appointment has been cancelled. Thank you for letting us know.';
      
      await this.sendTextMessage(phone, message);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      await this.sendTextMessage(
        phone,
        'Sorry, we encountered an error cancelling your appointment. Please try again later or contact the parlour directly.'
      );
    }
  }

  /**
   * Send help message
   * @param {string} phone - Customer phone number
   * @param {object} businessProfile - Business profile data
   * @returns {Promise<void>}
   */
  async sendHelpMessage(phone, businessProfile) {
    const message = `*${businessProfile.businessName} Help*\n\n` +
      'Here are the commands you can use:\n\n' +
      '• "Book [service] on [date] [time]" - Make an appointment\n' +
      '• "services" - View our service menu\n' +
      '• "hours" - Check our working hours\n' +
      '• "status" - Check your booking status\n' +
      '• "cancel" - Cancel an appointment\n' +
      '• "help" - Show this help message\n\n' +
      `For direct assistance, please call ${businessProfile.phone || 'the salon'}.`;
    
    await this.sendTextMessage(phone, message);
  }

  /**
   * Handle booking request
   * @param {string} phone - Customer phone number
   * @param {object} bookingData - Parsed booking data
   * @param {object} businessProfile - Business profile data
   * @param {string} parlourId - Parlour ID
   * @param {string} originalMessage - Original message text
   * @returns {Promise<void>}
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
        
        await this.sendTextMessage(
          phone,
          `Sorry, we couldn't find the service "${service}". Available services: ${availableServices || 'None'}`
        );
        return;
      }

      // Parse and validate date
      const parsedDate = this.formatDateForDisplay(date);
      const appointmentDate = new Date(parsedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        await this.sendTextMessage(
          phone,
          'Sorry, you cannot book an appointment in the past. Please provide a future date.'
        );
        return;
      }

      // In a real implementation, you would check availability and save to database
      // For this example, we'll just send a confirmation

      // Prepare appointment data
      const appointmentData = {
        customerName: `WhatsApp Customer (${formattedPhone})`,
        serviceName: matchingService.name,
        date: parsedDate,
        time: time
      };

      // Send confirmation
      await this.sendAppointmentConfirmation(
        phone,
        appointmentData
      );

      console.log(`Created appointment from WhatsApp for ${formattedPhone}`);
    } catch (error) {
      console.error('Error handling booking request:', error);
      await this.sendTextMessage(
        phone,
        'Sorry, we encountered an error processing your booking. Please try again with a different format like "Book Haircut on 2nd May 3PM" or contact the parlour directly.'
      );
    }
  }
}

module.exports = new WhatsAppService();