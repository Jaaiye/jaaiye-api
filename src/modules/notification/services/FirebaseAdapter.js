/**
 * Firebase Adapter for Notification Domain
 * Infrastructure layer - external services
 * Wraps shared FirebaseAdapter for push notifications
 * This is a thin wrapper that delegates to the shared FirebaseAdapter
 */

const SharedFirebaseAdapter = require('../../common/services/FirebaseAdapter');

class FirebaseAdapter {
  constructor() {
    this.firebaseAdapter = new SharedFirebaseAdapter();
  }

  /**
   * Send multicast message to multiple device tokens
   * @param {string[]} tokens - Array of FCM device tokens
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Response with successCount, failureCount, responses
   */
  async sendMulticast(tokens, notification, data = {}) {
    try {
      const response = await this.firebaseAdapter.sendMulticastMessage(tokens, notification, data);
      // If response has an error property, it means Firebase failed but handled gracefully
      if (response.error) {
        console.error('Firebase multicast send failed:', response.error);
      }
      return response;
    } catch (error) {
      console.error('Firebase multicast send failed:', error);
      // Return a graceful error response instead of throwing
      return {
        successCount: 0,
        failureCount: tokens?.length || 0,
        responses: [],
        error: error.message
      };
    }
  }

  /**
   * Send single message to one device token
   * @param {string} token - FCM device token
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Firebase response
   */
  async sendSingle(token, notification, data = {}) {
    try {
      const response = await this.firebaseAdapter.sendSingleMessage(token, notification, data);
      if (!response) {
        console.warn('Firebase single send returned null - Firebase may not be properly configured');
      }
      return response;
    } catch (error) {
      console.error('Firebase single send failed:', error);
      // Return null instead of throwing
      return null;
    }
  }
}

module.exports = FirebaseAdapter;

