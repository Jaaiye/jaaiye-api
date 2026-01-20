/**
 * Send Notification Use Case
 * Application layer - use case
 * Creates notification record and sends push notification with badge count
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
    if (this.pushNotificationAdapter) {
      setImmediate(async () => {
        try {
          // Get unread notification count for badge
          const unreadCount = await this.notificationRepository.count({
            userId: userIdStr,
            read: false
          });

          // Enhance data with badge count
          const enhancedData = {
            ...data,
            badge_count: String(unreadCount)
          };

          // Enhance notification object with APNS badge
          const enhancedNotification = {
            ...notification,
            apns: {
              payload: {
                aps: {
                  badge: unreadCount
                }
              }
            }
          };

          const result = await this.pushNotificationAdapter.send(
            userId,
            enhancedNotification,
            enhancedData
          );

          if (result.success) {
            console.log('Push notification sent successfully');
          } else {
            console.warn('Push notification failed', {
              reason: result.reason || result.error
            });
          }
        } catch (error) {
          console.error('Failed to send push notification:', {
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