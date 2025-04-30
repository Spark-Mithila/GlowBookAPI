const { db } = require('../utils/firebase');
const whatsappService = require('../services/whatsapp.service');

/**
 * Appointment Controller
 */
class AppointmentController {
  /**
   * Get all appointments for a parlour
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getAppointments(req, res) {
    try {
      const { uid } = req.user;
      const { status, date, customerId } = req.query;

      // Build query
      let query = db.collection('appointments').where('parlourId', '==', uid);

      // Apply filters if provided
      if (status) {
        query = query.where('status', '==', status);
      }

      if (date) {
        // Convert date string to start and end of day
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        query = query.where('appointmentDate', '>=', startDate.toISOString())
                     .where('appointmentDate', '<=', endDate.toISOString());
      }

      if (customerId) {
        query = query.where('customerId', '==', customerId);
      }

      // Order by date/time
      query = query.orderBy('appointmentDate', 'asc')
                   .orderBy('appointmentTime', 'asc');

      // Execute query
      const snapshot = await query.get();

      // Process results
      const appointments = [];
      snapshot.forEach(doc => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return res.status(200).json({
        status: 'success',
        data: appointments
      });
    } catch (error) {
      console.error('Get appointments error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get appointments'
      });
    }
  }

  /**
   * Get a single appointment
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getAppointment(req, res) {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get appointment document
      const appointmentDoc = await db.collection('appointments').doc(id).get();

      if (!appointmentDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Appointment not found'
        });
      }

      const appointment = appointmentDoc.data();

      // Check if the appointment belongs to this parlour
      if (appointment.parlourId !== uid) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied to this appointment'
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          id: appointmentDoc.id,
          ...appointment
        }
      });
    } catch (error) {
      console.error('Get appointment error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get appointment'
      });
    }
  }

  /**
   * Create a new appointment
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async createAppointment(req, res) {
    try {
      const { uid } = req.user;
      const { 
        customerId, 
        customerName,
        customerPhone,
        serviceId,
        serviceName,
        appointmentDate,
        appointmentTime,
        duration,
        price,
        notes = ''
      } = req.body;

      // Validate required fields
      if (!customerName || !customerPhone || !serviceName || !appointmentDate || !appointmentTime) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }

      // Format phone number
      const formattedPhone = customerPhone.startsWith('+') 
        ? customerPhone 
        : `+${customerPhone}`;

      // Check if the business profile exists
      const profileDoc = await db.collection('businessProfiles').doc(uid).get();
      
      if (!profileDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Business profile not found, create a profile first'
        });
      }

      // Create the appointment
      const appointmentData = {
        parlourId: uid,
        businessName: profileDoc.data().businessName,
        customerId: customerId || null, // Optional, can be null for walk-in customers
        customerName,
        customerPhone: formattedPhone,
        serviceId: serviceId || null,
        serviceName,
        appointmentDate,
        appointmentTime,
        duration: duration || 60, // Default 60 minutes if not specified
        price: price || 0,
        notes,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore
      const appointmentRef = await db.collection('appointments').add(appointmentData);

      // Send WhatsApp confirmation if a phone number is provided
      try {
        if (formattedPhone) {
          await whatsappService.sendAppointmentConfirmation(
            formattedPhone, 
            {
              customerName,
              serviceName,
              date: appointmentDate,
              time: appointmentTime
            }
          );
        }
      } catch (whatsappError) {
        console.error('WhatsApp notification error:', whatsappError);
        // Continue even if WhatsApp notification fails
      }

      // Return success response
      return res.status(201).json({
        status: 'success',
        message: 'Appointment created successfully',
        data: {
          id: appointmentRef.id,
          ...appointmentData
        }
      });
    } catch (error) {
      console.error('Create appointment error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to create appointment'
      });
    }
  }

  /**
   * Update an appointment
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async updateAppointment(req, res) {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { 
        customerName,
        customerPhone,
        serviceName,
        appointmentDate,
        appointmentTime,
        duration,
        price,
        notes,
        status
      } = req.body;

      // Get appointment document
      const appointmentRef = db.collection('appointments').doc(id);
      const appointmentDoc = await appointmentRef.get();

      if (!appointmentDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Appointment not found'
        });
      }

      const appointment = appointmentDoc.data();

      // Check if the appointment belongs to this parlour
      if (appointment.parlourId !== uid) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied to this appointment'
        });
      }

      // Prepare update data
      const updateData = {
        updatedAt: new Date().toISOString()
      };

      // Only update provided fields
      if (customerName) updateData.customerName = customerName;
      if (customerPhone) {
        updateData.customerPhone = customerPhone.startsWith('+') 
          ? customerPhone 
          : `+${customerPhone}`;
      }
      if (serviceName) updateData.serviceName = serviceName;
      if (appointmentDate) updateData.appointmentDate = appointmentDate;
      if (appointmentTime) updateData.appointmentTime = appointmentTime;
      if (duration) updateData.duration = duration;
      if (price !== undefined) updateData.price = price;
      if (notes !== undefined) updateData.notes = notes;
      if (status) updateData.status = status;

      // Update in Firestore
      await appointmentRef.update(updateData);

      // Send WhatsApp notification for status change if applicable
      if (status && status !== appointment.status && appointment.customerPhone) {
        try {
          if (status === 'confirmed') {
            await whatsappService.sendAppointmentConfirmation(
              appointment.customerPhone,
              {
                customerName: appointment.customerName,
                serviceName: appointment.serviceName,
                date: updateData.appointmentDate || appointment.appointmentDate,
                time: updateData.appointmentTime || appointment.appointmentTime
              }
            );
          } else if (status === 'cancelled') {
            await whatsappService.sendTextMessage(
              appointment.customerPhone,
              `Your appointment for ${appointment.serviceName} on ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled. Please contact us for more information.`
            );
          }
        } catch (whatsappError) {
          console.error('WhatsApp notification error:', whatsappError);
          // Continue even if WhatsApp notification fails
        }
      }

      // Return success response
      return res.status(200).json({
        status: 'success',
        message: 'Appointment updated successfully',
        data: {
          id,
          ...appointment,
          ...updateData
        }
      });
    } catch (error) {
      console.error('Update appointment error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to update appointment'
      });
    }
  }

  /**
   * Delete (cancel) an appointment
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async deleteAppointment(req, res) {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get appointment document
      const appointmentRef = db.collection('appointments').doc(id);
      const appointmentDoc = await appointmentRef.get();

      if (!appointmentDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Appointment not found'
        });
      }

      const appointment = appointmentDoc.data();

      // Check if the appointment belongs to this parlour
      if (appointment.parlourId !== uid) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied to this appointment'
        });
      }

      // Instead of deleting, mark as cancelled
      await appointmentRef.update({
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      // Send WhatsApp notification if applicable
      if (appointment.customerPhone) {
        try {
          await whatsappService.sendTextMessage(
            appointment.customerPhone,
            `Your appointment for ${appointment.serviceName} on ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled. Please contact us for more information.`
          );
        } catch (whatsappError) {
          console.error('WhatsApp notification error:', whatsappError);
          // Continue even if WhatsApp notification fails
        }
      }

      return res.status(200).json({
        status: 'success',
        message: 'Appointment cancelled successfully'
      });
    } catch (error) {
      console.error('Delete appointment error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to cancel appointment'
      });
    }
  }
}

module.exports = new AppointmentController();