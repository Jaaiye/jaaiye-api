/**
 * Firebase Adapter for Notification Domain
 * Infrastructure layer - external services
 * Wraps shared FirebaseAdapter for push notifications
 * This is a thin wrapper that delegates to the shared FirebaseAdapter
 */

const SharedFirebaseAdapter = require('../../../shared/infrastructure/adapters/FirebaseAdapter');

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
      return await this.firebaseAdapter.sendMulticastMessage(tokens, notification, data);
    } catch (error) {
      console.error('Firebase multicast send failed:', error);
      throw error;
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
      return await this.firebaseAdapter.sendSingleMessage(token, notification, data);
    } catch (error) {
      console.error('Firebase single send failed:', error);
      throw error;
    }
  }
}

module.exports = FirebaseAdapter;

