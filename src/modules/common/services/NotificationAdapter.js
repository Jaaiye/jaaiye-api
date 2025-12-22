/**
 * Notification Adapter
 * Infrastructure layer - external services
 * Wraps Notification domain's SendNotificationUseCase for push and in-app notifications
 * This adapter accepts SendNotificationUseCase as a dependency to avoid circular dependencies
 */

class NotificationAdapter {
  constructor({ sendNotificationUseCase, notificationRepository } = {}) {
    this.sendNotificationUseCase = sendNotificationUseCase;
    this.notificationRepository = notificationRepository;
  }

  /**
   * Send notification (creates in-app notification and sends push notification)
   * @param {string} userId - User ID
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data (optional)
   * @returns {Promise<void>}
   */
  async send(userId, notification, data = {}) {
    if (!this.sendNotificationUseCase) {
      console.warn('SendNotificationUseCase not provided to NotificationAdapter');
      return;
    }

    try {
      await this.sendNotificationUseCase.execute(userId, notification, data);
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send push notification only (for backward compatibility)
   * @param {string} userId - User ID
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data (optional)
   * @returns {Promise<void>}
   */
  async sendPush(userId, notification, data = {}) {
    // Delegate to send() which creates notification and sends push
    await this.send(userId, notification, data);
  }

  /**
   * Create in-app notification only (for backward compatibility)
   * @param {string} userId - User ID
   * @param {Object} notification - { title, body }
   * @param {Object} data - Additional data (optional)
   * @returns {Promise<void>}
   */
  async createInApp(userId, notification, data = {}) {
    if (!this.notificationRepository) {
      console.warn('NotificationRepository not provided to NotificationAdapter');
      return;
    }

    try {
      // Create notification record without sending push
      await this.notificationRepository.create({
        user: userId,
        title: notification.title,
        message: notification.body || notification.message,
        type: data.type || 'system',
        data: data,
        priority: data.priority || 'medium'
      });
    } catch (error) {
      console.error('Failed to create in-app notification:', error);
      // Don't throw - notifications are non-critical
    }
  }
}

module.exports = NotificationAdapter;

