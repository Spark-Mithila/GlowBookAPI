const { db } = require('../utils/firebase');

/**
 * Customer Controller
 */
class CustomerController {
  /**
   * Get customer appointment history
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getCustomerHistory(req, res) {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Validate required fields
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer ID is required'
        });
      }

      // Query appointments by customer ID and parlour ID
      const snapshot = await db.collection('appointments')
        .where('parlourId', '==', uid)
        .where('customerId', '==', id)
        .orderBy('appointmentDate', 'desc')
        .get();

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
      console.error('Get customer history error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get customer history'
      });
    }
  }

  /**
   * Get customer appointment history by phone number
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getCustomerHistoryByPhone(req, res) {
    try {
      const { uid } = req.user;
      const { phone } = req.params;

      // Validate required fields
      if (!phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer phone number is required'
        });
      }

      // Format phone number
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

      // Query appointments by customer phone and parlour ID
      const snapshot = await db.collection('appointments')
        .where('parlourId', '==', uid)
        .where('customerPhone', '==', formattedPhone)
        .orderBy('appointmentDate', 'desc')
        .get();

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
      console.error('Get customer history by phone error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get customer history'
      });
    }
  }

  /**
   * Get all customers for a parlour
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getCustomers(req, res) {
    try {
      const { uid } = req.user;

      // Get distinct customers from appointments
      const snapshot = await db.collection('appointments')
        .where('parlourId', '==', uid)
        .get();

      // Use a Map to deduplicate customers by phone
      const customerMap = new Map();

      snapshot.forEach(doc => {
        const appointment = doc.data();
        
        if (!customerMap.has(appointment.customerPhone)) {
          customerMap.set(appointment.customerPhone, {
            customerPhone: appointment.customerPhone,
            customerName: appointment.customerName,
            customerId: appointment.customerId,
            lastAppointment: appointment.appointmentDate,
            appointmentCount: 1
          });
        } else {
          // Update existing customer record
          const customer = customerMap.get(appointment.customerPhone);
          
          // Update last appointment date if this one is newer
          if (appointment.appointmentDate > customer.lastAppointment) {
            customer.lastAppointment = appointment.appointmentDate;
          }
          
          // Increment appointment count
          customer.appointmentCount += 1;
        }
      });

      // Convert Map to array
      const customers = Array.from(customerMap.values());

      return res.status(200).json({
        status: 'success',
        data: customers
      });
    } catch (error) {
      console.error('Get customers error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get customers'
      });
    }
  }
}

module.exports = new CustomerController();