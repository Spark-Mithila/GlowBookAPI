const axios = require('axios');
require('dotenv').config();

/**
 * Service to handle WhatsApp API interactions
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
   * Send a message with reply buttons
   * @param {string} to - Recipient's phone number with country code
   * @param {string} headerText - Header text (optional)
   * @param {string} bodyText - Body text
   * @param {string} footerText - Footer text (optional)
   * @param {Array} buttons - Array of button objects with id and title
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
   * @param {string} headerText - Header text (optional)
   * @param {string} bodyText - Body text
   * @param {string} buttonText - Text on the button that opens the list
   * @param {string} footerText - Footer text (optional)
   * @param {Array} sections - Array of section objects with title and rows
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
   * Send a template message with appointment details
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   */
  async sendAppointmentConfirmation(to, appointmentData) {
    try {
      const { customerName, serviceName, date, time } = appointmentData;
      
      // Format date for better readability
      let formattedDate = date;
      
      if (typeof date === 'string' && date.includes('T')) {
        // Handle ISO dates
        formattedDate = new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      } else if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Handle YYYY-MM-DD format
        formattedDate = new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'appointment_confirmation',
          language: { code: 'en_US' },
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
        const { customerName, serviceName, date, time } = appointmentData;
        let formattedDate = date;
        
        if (typeof date === 'string' && (date.includes('T') || date.match(/^\d{4}-\d{2}-\d{2}$/))) {
          formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          });
        }
        
        const message = `Your appointment has been confirmed!\n\n*Booking Details*\nName: ${customerName}\nService: ${serviceName}\nDate: ${formattedDate}\nTime: ${time}\n\nWe look forward to seeing you!`;
        
        await this.sendTextMessage(to, message);
        console.log('Sent fallback text message for appointment confirmation');
      } catch (fallbackError) {
        console.error('Error sending fallback appointment confirmation:', fallbackError);
      }
      
      throw new Error('Failed to send appointment confirmation');
    }
  }

  /**
   * Send appointment reminder
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   */
  async sendAppointmentReminder(to, appointmentData) {
    try {
      const { customerName, serviceName, date, time } = appointmentData;
      
      // Format date for better readability
      let formattedDate = date;
      
      if (typeof date === 'string' && (date.includes('T') || date.match(/^\d{4}-\d{2}-\d{2}$/))) {
        formattedDate = new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: 'appointment_reminder',
          language: { code: 'en_US' },
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
        const { customerName, serviceName, date, time } = appointmentData;
        let formattedDate = date;
        
        if (typeof date === 'string' && (date.includes('T') || date.match(/^\d{4}-\d{2}-\d{2}$/))) {
          formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          });
        }
        
        const message = `Reminder: You have an appointment tomorrow!\n\n*Booking Details*\nName: ${customerName}\nService: ${serviceName}\nDate: ${formattedDate}\nTime: ${time}\n\nWe look forward to seeing you! Reply CONFIRM to confirm or CANCEL to cancel.`;
        
        await this.sendTextMessage(to, message);
        console.log('Sent fallback text message for appointment reminder');
      } catch (fallbackError) {
        console.error('Error sending fallback appointment reminder:', fallbackError);
      }
      
      throw new Error('Failed to send appointment reminder');
    }
  }

  /**
   * Send a service list message with interactive buttons
   * @param {string} to - Recipient's phone number with country code
   * @param {Array} services - Array of service objects
   * @param {string} businessName - Business name
   */
  async sendServicesListInteractive(to, services, businessName) {
    try {
      // If no services, send text message
      if (!services || services.length === 0) {
        await this.sendTextMessage(
          to,
          `${businessName} hasn't set up their services yet. Please contact them directly.`
        );
        return;
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
      await this.sendListMessage(
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
      await this.sendServicesList(to, services, businessName);
    }
  }

  /**
   * Send a text-based services list (fallback)
   * @param {string} to - Recipient's phone number with country code
   * @param {Array} services - Array of service objects
   * @param {string} businessName - Business name
   */
  async sendServicesList(to, services, businessName) {
    if (!services || services.length === 0) {
      await this.sendTextMessage(
        to,
        `${businessName} hasn't set up their services yet. Please contact them directly.`
      );
      return;
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
    
    await this.sendTextMessage(to, message);
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
}

module.exports = new WhatsAppService();