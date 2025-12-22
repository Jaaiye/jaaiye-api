/**
 * Firebase Adapter
 * Wraps Firebase Admin SDK for custom token generation
 * Infrastructure layer - external services
 */

const admin = require('firebase-admin');
const path = require('path');

class FirebaseAdapter {
  constructor() {
    this.initialized = false;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   * @private
   */
  initializeFirebase() {
    if (this.initialized) return;

    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        return;
      }

      // Validate required environment variables
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        console.warn(`Firebase Admin not initialized: Missing environment variables: ${missingVars.join(', ')}`);
        return;
      }

      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: "googleapis.com"
      };

      // Validate service account data
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        console.warn('Firebase Admin not initialized: Invalid service account configuration');
        return;
      }

      // Initialize Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      this.initialized = true;
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error.message);
      // Don't throw - allow app to run without Firebase
      this.initialized = false;
    }
  }

  /**
   * Generate custom Firebase token for user
   * @param {string} userId - User ID
   * @returns {Promise<string>} Firebase custom token
   */
  async generateToken(userId) {
    if (!this.initialized) {
      console.warn('Firebase not initialized, returning null token');
      return null;
    }

    try {
      const customToken = await admin.auth().createCustomToken(userId);
      return customToken;
    } catch (error) {
      console.error('Failed to generate Firebase token:', error.message);
      // Return null instead of throwing - graceful degradation
      return null;
    }
  }

  /**
   * Verify Firebase ID token
   * @param {string} idToken - Firebase ID token
   * @returns {Promise<Object>} Decoded token
   */
  async verifyIdToken(idToken) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error(`Invalid Firebase token: ${error.message}`);
    }
  }

  /**
   * Send multicast message to multiple device tokens (FCM)
   * @param {string[]} tokens - Array of FCM device tokens
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Response with successCount, failureCount, responses
   */
  async sendMulticastMessage(tokens, notification, data = {}) {
    if (!this.initialized) {
      console.warn('Firebase not initialized, skipping multicast message');
      return { successCount: 0, failureCount: tokens?.length || 0, responses: [] };
    }

    try {
      if (!tokens || tokens.length === 0) {
        return { successCount: 0, failureCount: 0, responses: [] };
      }

      // Validate that messaging is available
      if (!admin.messaging) {
        console.error('Firebase messaging not available - FCM may not be enabled for this project');
        return { successCount: 0, failureCount: tokens.length, responses: [] };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: this._serializeData(data),
        tokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`Firebase message sent: ${response.successCount} success, ${response.failureCount} failed`);

      return response;
    } catch (error) {
      // Handle specific Firebase errors gracefully
      if (error.code === 'messaging/unknown-error' || error.code === 'messaging/invalid-argument') {
        console.error('Firebase sendMulticastMessage error:', error.message);
        // Return a response indicating failure but don't throw
        return {
          successCount: 0,
          failureCount: tokens?.length || 0,
          responses: [],
          error: error.message
        };
      }
      console.error('Firebase sendMulticastMessage error:', error);
      // For other errors, still return gracefully
      return {
        successCount: 0,
        failureCount: tokens?.length || 0,
        responses: [],
        error: error.message
      };
    }
  }

  /**
   * Send single message to one device token (FCM)
   * @param {string} token - FCM device token
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Firebase response
   */
  async sendSingleMessage(token, notification, data = {}) {
    if (!this.initialized) {
      console.warn('Firebase not initialized, skipping single message');
      return null;
    }

    try {
      // Validate that messaging is available
      if (!admin.messaging) {
        console.error('Firebase messaging not available - FCM may not be enabled for this project');
        return null;
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: this._serializeData(data),
        token,
      };

      const response = await admin.messaging().send(message);
      console.log('Firebase single message sent successfully');

      return response;
    } catch (error) {
      // Handle specific Firebase errors gracefully
      if (error.code === 'messaging/unknown-error' || error.code === 'messaging/invalid-argument') {
        console.error('Firebase sendSingleMessage error:', error.message);
        return null;
      }
      console.error('Firebase sendSingleMessage error:', error);
      return null;
    }
  }

  /**
   * Serialize data object to string values (FCM requirement)
   * @private
   */
  _serializeData(data) {
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      // FCM data must be strings
      serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return serialized;
  }

  // ============================================================================
  // FIRESTORE METHODS (for Group functionality)
  // ============================================================================

  /**
   * Create a group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} groupData - Group data
   * @returns {Promise<Object>} Success response
   */
  async createGroup(groupId, groupData) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Ensure all values are serializable primitives
      const sanitizedData = {
        name: String(groupData.name || ''),
        description: String(groupData.description || ''),
        creator: String(groupData.creator || ''),
        members: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Sanitize members object
      if (groupData.members && typeof groupData.members === 'object') {
        for (const [key, value] of Object.entries(groupData.members)) {
          sanitizedData.members[String(key)] = {
            name: String(value.name || 'Unknown User'),
            avatar: String(value.avatar || ''),
            role: String(value.role || 'member')
          };
        }
      }

      await admin.firestore()
        .collection('groups')
        .doc(String(groupId))
        .set(sanitizedData);

      console.log(`Group created in Firebase: ${groupId}`);
      return { success: true, id: groupId };
    } catch (error) {
      console.error('Firebase createGroup error:', error);
      throw new Error('Failed to create group in Firebase');
    }
  }

  /**
   * Get group snapshot from Firestore
   * @param {string} groupId - Group ID
   * @returns {Promise<Object|null>} Group data or null
   */
  async getGroupSnapshot(groupId) {
    if (!this.initialized) {
      return null;
    }

    try {
      const doc = await admin.firestore().collection('groups').doc(groupId.toString()).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Firebase getGroupSnapshot error:', error);
      return null;
    }
  }

  /**
   * Update group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} updates - Update data
   * @returns {Promise<void>}
   */
  async updateGroup(groupId, updates) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const sanitizedUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'updatedAt') {
          sanitizedUpdates[key] = admin.firestore.FieldValue.serverTimestamp();
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively sanitize nested objects
          sanitizedUpdates[key] = {};
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            sanitizedUpdates[key][nestedKey] = String(nestedValue);
          }
        } else {
          sanitizedUpdates[key] = String(value);
        }
      }

      await admin.firestore().collection('groups').doc(groupId.toString()).update(sanitizedUpdates);
    } catch (error) {
      console.error('Firebase updateGroup error:', error);
      throw new Error('Failed to update group in Firebase');
    }
  }

  /**
   * Delete group from Firestore
   * @param {string} groupId - Group ID
   * @returns {Promise<void>}
   */
  async deleteGroup(groupId) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      await admin.firestore().collection('groups').doc(groupId.toString()).delete();
      console.log(`Group deleted from Firebase: ${groupId}`);
    } catch (error) {
      console.error('Firebase deleteGroup error:', error);
      throw new Error('Failed to delete group from Firebase');
    }
  }

  /**
   * Add member to group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} memberData - Member data
   * @returns {Promise<void>}
   */
  async addMember(groupId, memberData) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      await admin.firestore().collection('groups').doc(groupId).update({
        [`members.${memberData.id}`]: {
          name: String(memberData.name || 'Unknown User'),
          avatar: String(memberData.avatar || ''),
          role: String(memberData.role || 'member')
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Firebase addMember error:', error);
      throw error;
    }
  }

  /**
   * Remove member from group in Firestore
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @returns {Promise<void>}
   */
  async removeMember(groupId, memberId) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      await admin.firestore().collection('groups').doc(groupId).update({
        [`members.${memberId}`]: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Firebase removeMember error:', error);
      throw error;
    }
  }
}

module.exports = FirebaseAdapter;

