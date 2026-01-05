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
    // Ensure userId is a string/ObjectId
    const userIdStr = userId?.toString ? userId.toString() : String(userId);

    // Create notification record
    const notificationEntity = await this.notificationRepository.create({
      userId: userIdStr,
      title: notification.title,
      body: notification.body || notification.message || '',
      type: data.type || 'system',
      data: data,
      priority: data.priority || 'medium'
    });

    // Send push notification (non-blocking, fire-and-forget)
    // Only send if pushNotificationAdapter is available
    if (this.pushNotificationAdapter) {
      setImmediate(async () => {
        try {
          const result = await this.pushNotificationAdapter.send(userId, notification, data);

          if (result.success) {
            console.log('Push notification sent successfully', {
              userId,
              notificationTitle: notification.title,
              successCount: result.successCount,
              failureCount: result.failureCount
            });
          } else {
            console.warn('Push notification failed', {
              userId,
              notificationTitle: notification.title,
              reason: result.reason || result.error
            });
          }
        } catch (error) {
          console.error('Failed to send push notification:', {
            userId,
            notificationTitle: notification.title,
            error: error.message,
            stack: error.stack
          });
        }
      });
    } else {
      console.warn('Push notification not sent - pushNotificationAdapter not available', { userId });
    }

    return notificationEntity.toJSON();
  }
}

module.exports = SendNotificationUseCase;

