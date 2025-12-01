/**
 * Send Notification Use Case
 * Application layer - use case
 * Creates notification record and sends push notification
 */

class SendNotificationUseCase {
  constructor({
    notificationRepository,
    pushNotificationAdapter
  }) {
    this.notificationRepository = notificationRepository;
    this.pushNotificationAdapter = pushNotificationAdapter;
  }

  async execute(userId, notification, data = {}) {
    // Create notification record
    const notificationEntity = await this.notificationRepository.create({
      user: userId,
      title: notification.title,
      message: notification.body || notification.message,
      type: data.type || 'system',
      data: data,
      priority: data.priority || 'medium'
    });

    // Send push notification (non-blocking, fire-and-forget)
    setImmediate(() => {
      this.pushNotificationAdapter.send(userId, notification, data)
        .catch(error => {
          console.error('Failed to send push notification:', error);
        });
    });

    return notificationEntity.toJSON();
  }
}

module.exports = SendNotificationUseCase;

