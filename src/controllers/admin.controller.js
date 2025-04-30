const { db, auth, firebaseAdmin } = require('../utils/firebase');

/**
 * Admin Controller for Superadmin operations
 */
class AdminController {
  /**
   * Get all users
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getAllUsers(req, res) {
    try {
      // Get all users from Firestore
      const snapshot = await db.collection('users').get();
      
      const users = [];
      snapshot.forEach(doc => {
        users.push({
          uid: doc.id,
          ...doc.data(),
          // Remove sensitive fields
          password: undefined
        });
      });

      return res.status(200).json({
        status: 'success',
        data: users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get users'
      });
    }
  }

  /**
   * Create a new user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async createUser(req, res) {
    try {
      const { 
        email, 
        password, 
        fullName, 
        phoneNumber, 
        role = 'parlourOwner',
        plan = 'free' 
      } = req.body;

      // Validate required fields
      if (!email || !password || !fullName) {
        return res.status(400).json({
          status: 'error',
          message: 'Email, password and full name are required'
        });
      }

      // Check if user with this email already exists
      const userExists = await auth.getUserByEmail(email).catch(() => null);
      
      if (userExists) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email already exists'
        });
      }

      // Format phone number if provided
      const formattedPhone = phoneNumber ? 
        (phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`) : 
        null;

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName,
        phoneNumber: formattedPhone
      });

      // Set custom claims
      await auth.setCustomUserClaims(userRecord.uid, {
        role,
        plan
      });

      // Create user document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        fullName,
        phoneNumber: formattedPhone,
        role,
        plan,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          uid: userRecord.uid,
          email,
          fullName,
          phoneNumber: formattedPhone,
          role,
          plan
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to create user'
      });
    }
  }

  /**
   * Update a user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { 
        fullName, 
        phoneNumber, 
        role,
        plan,
        password
      } = req.body;

      // Validate user exists
      const userExists = await auth.getUser(id).catch(() => null);
      
      if (!userExists) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Update in Firebase Auth
      const authUpdates = {};
      
      if (fullName) authUpdates.displayName = fullName;
      if (phoneNumber) {
        authUpdates.phoneNumber = phoneNumber.startsWith('+') 
          ? phoneNumber 
          : `+${phoneNumber}`;
      }
      if (password) authUpdates.password = password;

      if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(id, authUpdates);
      }

      // Update custom claims if role or plan changed
      if (role || plan) {
        const currentCustomClaims = userExists.customClaims || {};
        
        await auth.setCustomUserClaims(id, {
          ...currentCustomClaims,
          role: role || currentCustomClaims.role,
          plan: plan || currentCustomClaims.plan
        });
      }

      // Update in Firestore
      const updates = {
        updatedAt: new Date().toISOString()
      };

      if (fullName) updates.fullName = fullName;
      if (phoneNumber) {
        updates.phoneNumber = phoneNumber.startsWith('+') 
          ? phoneNumber 
          : `+${phoneNumber}`;
      }
      if (role) updates.role = role;
      if (plan) updates.plan = plan;

      await db.collection('users').doc(id).update(updates);

      return res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: {
          uid: id,
          ...updates
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to update user'
      });
    }
  }

  /**
   * Delete a user
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Validate user exists
      const userExists = await auth.getUser(id).catch(() => null);
      
      if (!userExists) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Delete from Firebase Auth
      await auth.deleteUser(id);

      // Delete from Firestore
      await db.collection('users').doc(id).delete();

      // Additionally, we might want to clean up related data
      // Like business profile and appointments

      // Get all appointments for this parlour
      const appointmentsSnapshot = await db.collection('appointments')
        .where('parlourId', '==', id)
        .get();

      // Delete each appointment
      const batch = db.batch();
      appointmentsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete business profile if exists
      const profileRef = db.collection('businessProfiles').doc(id);
      batch.delete(profileRef);

      // Commit the batch
      await batch.commit();

      return res.status(200).json({
        status: 'success',
        message: 'User and associated data deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to delete user'
      });
    }
  }

  /**
   * Get platform analytics
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getAnalytics(req, res) {
    try {
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      
      // Get all appointments
      const appointmentsSnapshot = await db.collection('appointments').get();
      
      // Initialize analytics data
      const analytics = {
        totalUsers: 0,
        usersByPlan: {
          free: 0,
          basic: 0,
          premium: 0
        },
        totalAppointments: appointmentsSnapshot.size,
        appointmentsByStatus: {
          scheduled: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0
        },
        totalRevenue: 0,
        userStats: []
      };

      // Process users
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        analytics.totalUsers++;
        
        // Count by plan
        const plan = userData.plan || 'free';
        analytics.usersByPlan[plan] = (analytics.usersByPlan[plan] || 0) + 1;
        
        // Add to user stats array
        analytics.userStats.push({
          uid: doc.id,
          fullName: userData.fullName,
          email: userData.email,
          plan: plan,
          createdAt: userData.createdAt
        });
      });

      // Process appointments
      appointmentsSnapshot.forEach(doc => {
        const appointment = doc.data();
        
        // Count by status
        const status = appointment.status || 'scheduled';
        analytics.appointmentsByStatus[status] = (analytics.appointmentsByStatus[status] || 0) + 1;
        
        // Sum revenue (price field)
        if (appointment.price && appointment.status !== 'cancelled') {
          analytics.totalRevenue += parseFloat(appointment.price);
        }
      });

      return res.status(200).json({
        status: 'success',
        data: analytics
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get analytics'
      });
    }
  }
}

module.exports = new AdminController();