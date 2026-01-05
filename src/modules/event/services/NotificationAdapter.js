/**
 * Notification Adapter for Event Domain
 * Infrastructure layer - external services
 * Uses Notification domain's SendNotificationUseCase
 */

class NotificationAdapter {
  constructor({ sendNotificationUseCase }) {
    this.sendNotificationUseCase = sendNotificationUseCase;
  }

  /**
   * Send notification to user
   * Creates notification record and sends push notification
   * @param {string} userId - User ID
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data
   * @returns {Promise<void>}
   */
  async send(userId, notification, data = {}) {
    try {
      await this.sendNotificationUseCase.execute(userId, notification, data);
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send notifications to multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data
   * @returns {Promise<void>}
   */
  async sendMany(userIds, notification, data = {}) {
    await Promise.all(
      userIds.map(userId => this.send(userId, notification, data))
    );
  }
}

module.exports = NotificationAdapter;

