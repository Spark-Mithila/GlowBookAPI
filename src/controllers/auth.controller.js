const { auth, db } = require('../utils/firebase');

/**
 * Authentication Controller
 */
class AuthController {
  /**
   * Create a new user in Firebase Auth and Firestore
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async register(req, res) {
    try {
      const { email, password, fullName, phoneNumber } = req.body;

      if (!email || !password || !fullName || !phoneNumber) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName,
        phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
      });

      // Set custom claims for user role
      await auth.setCustomUserClaims(userRecord.uid, {
        role: 'parlourOwner',
        plan: 'free' // Default plan
      });

      // Create user document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        fullName,
        phoneNumber,
        role: 'parlourOwner',
        plan: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Return success response
      return res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: 'parlourOwner'
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to register user'
      });
    }
  }

  /**
   * Get current user profile information
   * @param {object} req - Express request object with user data from auth middleware
   * @param {object} res - Express response object
   */
  async getCurrentUser(req, res) {
    try {
      const { uid } = req.user;
      // Get user document from Firestore
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Return user data
      return res.status(200).json({
        status: 'success',
        data: {
          uid,
          ...userDoc.data(),
          // Remove sensitive fields
          password: undefined
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get user profile'
      });
    }
  }

  /**
   * Update user profile
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const { uid } = req.user;
      const { fullName, phoneNumber } = req.body;

      const updates = {};
      
      if (fullName) updates.fullName = fullName;
      if (phoneNumber) updates.phoneNumber = phoneNumber;
      
      updates.updatedAt = new Date().toISOString();

      // Update user in Firestore
      await db.collection('users').doc(uid).update(updates);

      // Also update in Firebase Auth if needed
      const authUpdates = {};
      
      if (fullName) authUpdates.displayName = fullName;
      if (phoneNumber) {
        authUpdates.phoneNumber = phoneNumber.startsWith('+') 
          ? phoneNumber 
          : `+${phoneNumber}`;
      }

      if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(uid, authUpdates);
      }

      return res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { uid, ...updates }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to update profile'
      });
    }
  }
}

module.exports = new AuthController();