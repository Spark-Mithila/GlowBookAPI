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
   * Send a template message with appointment details
   * @param {string} to - Recipient's phone number with country code
   * @param {object} appointmentData - Appointment details
   */
  async sendAppointmentConfirmation(to, appointmentData) {
    try {
      const { customerName, serviceName, date, time } = appointmentData;
      
      // Format date for better readability
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

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
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

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
      throw new Error('Failed to send appointment reminder');
    }
  }

  /**
   * Parse incoming WhatsApp message for appointment booking
   * @param {string} message - Incoming message text
   * @returns {object|null} - Parsed appointment data or null if parsing failed
   */
  parseBookingMessage(message) {
    try {
      // Simple regex pattern to extract service, date and time
      // Format expected: "Book [service] on [date] [time]"
      // Example: "Book Haircut on 2nd May 3PM"
      const bookingPattern = /book\s+(.+?)\s+on\s+(.+?)\s+(\d+(?::\d+)?(?:\s*[ap]m)?)/i;
      const match = message.match(bookingPattern);

      if (!match) {
        return null;
      }

      const [, service, dateStr, timeStr] = match;
      
      return {
        service: service.trim(),
        date: dateStr.trim(),
        time: timeStr.trim(),
      };
    } catch (error) {
      console.error('Error parsing booking message:', error);
      return null;
    }
  }
}

module.exports = new WhatsAppService();