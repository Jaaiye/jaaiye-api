/**
 * Push Notification Adapter
 * Infrastructure layer - external services
 * Handles push notifications via Firebase Cloud Messaging
 */

const UserSchema = require('../../common/entities/User.schema');
const FirebaseAdapter = require('./FirebaseAdapter');
const DeviceTokenAdapter = require('./DeviceTokenAdapter');

class PushNotificationAdapter {
  constructor({ firebaseAdapter, deviceTokenAdapter }) {
    this.firebaseAdapter = firebaseAdapter;
    this.deviceTokenAdapter = deviceTokenAdapter;
  }

  /**
   * Send push notification to user
   * @param {string} userId - User ID
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data
   * @returns {Promise<Object>}
   */
  async send(userId, notification, data = {}) {
    try {
      // Check user preferences
      const user = await UserSchema.findById(userId).select('preferences deviceTokens');
      if (!user) {
        console.warn('Push notification failed - user not found', { userId });
        return { success: false, reason: 'User not found' };
      }

      if (!user.preferences?.notifications?.push) {
        console.info('Push notification skipped - user has push notifications disabled', { userId });
        return { success: false, reason: 'Push notifications disabled by user' };
      }

      // Get device tokens
      const deviceTokens = user.deviceTokens?.map(dt => dt.token) || [];
      if (deviceTokens.length === 0) {
        console.warn('Push notification failed - no device tokens found', { userId });
        return { success: false, reason: 'No device tokens found' };
      }

      console.log('Sending push notification', {
        userId,
        tokenCount: deviceTokens.length,
        notificationTitle: notification.title
      });

      // Send via Firebase
      const response = await this.firebaseAdapter.sendMulticast(deviceTokens, notification, data);

      // Check if Firebase returned an error
      if (response.error) {
        return { success: false, reason: `Firebase error: ${response.error}` };
      }

      // Handle failed tokens in background
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(deviceTokens[idx]);
          }
        });

        // Remove failed tokens in background
        if (failedTokens.length > 0) {
          setImmediate(() => {
            this.deviceTokenAdapter.removeFailedTokens(userId, failedTokens)
              .catch(error => console.error('Background token cleanup failed:', error));
          });
        }
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      console.error('Failed to send push notification:', error);
      // Don't throw - notifications are non-critical
      return { success: false, error: error.message };
    }
  }
}

module.exports = PushNotificationAdapter;

