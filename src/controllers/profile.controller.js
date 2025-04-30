const { db } = require('../utils/firebase');

/**
 * Business Profile Controller
 */
class ProfileController {
  /**
   * Create or update business profile
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async saveProfile(req, res) {
    try {
      const { uid } = req.user;
      const { 
        businessName, 
        whatsappNumber, 
        services = [],
        workingHours = {},
        address = {},
        description = ''
      } = req.body;

      // Validate required fields
      if (!businessName || !whatsappNumber) {
        return res.status(400).json({
          status: 'error',
          message: 'Business name and WhatsApp number are required'
        });
      }

      // Format phone number if needed
      const formattedWhatsappNumber = whatsappNumber.startsWith('+') 
        ? whatsappNumber 
        : `+${whatsappNumber}`;

      // Create or update profile document
      const profileData = {
        businessName,
        whatsappNumber: formattedWhatsappNumber,
        services,
        workingHours,
        address,
        description,
        updatedAt: new Date().toISOString()
      };

      // Check if profile already exists
      const profileRef = db.collection('businessProfiles').doc(uid);
      const profileDoc = await profileRef.get();

      if (profileDoc.exists) {
        // Update existing profile
        await profileRef.update({
          ...profileData
        });

        return res.status(200).json({
          status: 'success',
          message: 'Business profile updated successfully',
          data: {
            uid,
            ...profileData,
            createdAt: profileDoc.data().createdAt
          }
        });
      } else {
        // Create new profile
        profileData.createdAt = new Date().toISOString();
        profileData.ownerId = uid;
        
        await profileRef.set(profileData);

        return res.status(201).json({
          status: 'success',
          message: 'Business profile created successfully',
          data: {
            uid,
            ...profileData
          }
        });
      }
    } catch (error) {
      console.error('Save profile error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to save business profile'
      });
    }
  }

  /**
   * Get business profile
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const { uid } = req.user;

      // Get profile document
      const profileDoc = await db.collection('businessProfiles').doc(uid).get();

      if (!profileDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Business profile not found'
        });
      }

      // Return profile data
      return res.status(200).json({
        status: 'success',
        data: {
          uid,
          ...profileDoc.data()
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get business profile'
      });
    }
  }

  /**
   * Add or update a service
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async saveService(req, res) {
    try {
      const { uid } = req.user;
      const { serviceId } = req.params;
      const { 
        name, 
        duration, 
        price, 
        description = '' 
      } = req.body;

      // Validate required fields
      if (!name || !duration || !price) {
        return res.status(400).json({
          status: 'error',
          message: 'Service name, duration and price are required'
        });
      }

      // Get profile document
      const profileRef = db.collection('businessProfiles').doc(uid);
      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Business profile not found, create a profile first'
        });
      }

      // Prepare service data
      const serviceData = {
        name,
        duration,
        price,
        description,
        updatedAt: new Date().toISOString()
      };

      // Get current services
      const profile = profileDoc.data();
      const services = profile.services || [];

      if (serviceId) {
        // Update existing service
        const serviceIndex = services.findIndex(s => s.id === serviceId);
        
        if (serviceIndex === -1) {
          return res.status(404).json({
            status: 'error',
            message: 'Service not found'
          });
        }

        // Keep original creation date
        serviceData.createdAt = services[serviceIndex].createdAt;
        serviceData.id = serviceId;
        
        services[serviceIndex] = serviceData;
      } else {
        // Add new service
        serviceData.id = Date.now().toString();
        serviceData.createdAt = new Date().toISOString();
        services.push(serviceData);
      }

      // Update profile with updated services
      await profileRef.update({
        services,
        updatedAt: new Date().toISOString()
      });

      return res.status(200).json({
        status: 'success',
        message: serviceId ? 'Service updated successfully' : 'Service added successfully',
        data: serviceData
      });
    } catch (error) {
      console.error('Save service error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to save service'
      });
    }
  }

  /**
   * Delete a service
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async deleteService(req, res) {
    try {
      const { uid } = req.user;
      const { serviceId } = req.params;

      if (!serviceId) {
        return res.status(400).json({
          status: 'error',
          message: 'Service ID is required'
        });
      }

      // Get profile document
      const profileRef = db.collection('businessProfiles').doc(uid);
      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Business profile not found'
        });
      }

      // Get current services
      const profile = profileDoc.data();
      const services = profile.services || [];
      
      // Find service to delete
      const serviceIndex = services.findIndex(s => s.id === serviceId);
      
      if (serviceIndex === -1) {
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }

      // Remove service
      services.splice(serviceIndex, 1);

      // Update profile with updated services
      await profileRef.update({
        services,
        updatedAt: new Date().toISOString()
      });

      return res.status(200).json({
        status: 'success',
        message: 'Service deleted successfully'
      });
    } catch (error) {
      console.error('Delete service error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to delete service'
      });
    }
  }

  /**
   * Update working hours
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async updateWorkingHours(req, res) {
    try {
      const { uid } = req.user;
      const { workingHours } = req.body;

      if (!workingHours || typeof workingHours !== 'object') {
        return res.status(400).json({
          status: 'error',
          message: 'Working hours data is required'
        });
      }

      // Get profile document
      const profileRef = db.collection('businessProfiles').doc(uid);
      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'Business profile not found, create a profile first'
        });
      }

      // Update working hours
      await profileRef.update({
        workingHours,
        updatedAt: new Date().toISOString()
      });

      return res.status(200).json({
        status: 'success',
        message: 'Working hours updated successfully',
        data: workingHours
      });
    } catch (error) {
      console.error('Update working hours error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to update working hours'
      });
    }
  }
}

module.exports = new ProfileController();