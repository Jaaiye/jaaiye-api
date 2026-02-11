const logger = require('../../utils/logger');
const firebaseService = require('../common/services/firebase.service');
const deviceTokenService = require('../notification/services/device-token.service');

class NotificationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = 10; // Process 10 notifications at a time
    this.batchTimeout = 1000; // 1 second
    this.batchTimer = null;
    this.maxRetries = 3;
  }

  // Add notification to queue (fire-and-forget)
  addToQueue(notificationTask) {
    this.queue.push({
      ...notificationTask,
      retries: 0,
      createdAt: new Date()
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    // Set batch timeout
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processQueue();
    }, this.batchTimeout);

    logger.debug('Notification added to queue', {
      type: notificationTask.type,
      userId: notificationTask.userId,
      queueLength: this.queue.length
    });
  }

  // Process queue in batches
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    let stats = { total: 0, success: 0, failed: 0, retrying: 0 };

    try {
      // Process in batches
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);
        stats.total += batch.length;

        // Process batch concurrently
        const promises = batch.map(task => this.executeNotificationTask(task));
        const results = await Promise.allSettled(promises);

        // Update stats from results
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            if (res.value?.retrying) stats.retrying++;
            else stats.success++;
          } else {
            stats.failed++;
          }
        });
      }

      if (stats.total > 0) {
        logger.info('Notification batch processing completed', stats);
      }
    } catch (error) {
      logger.error('Error processing notification queue:', error);
    } finally {
      this.processing = false;

      // If more items were added while processing, continue
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  // Execute individual notification task
  async executeNotificationTask(task) {
    try {
      const { type, userId, notification, data, retries } = task;

      logger.debug('Processing notification task', {
        type,
        userId,
        notificationTitle: notification.title,
        retries
      });

      switch (type) {
        case 'push':
          await this.sendPushNotification(userId, notification, data);
          break;
        case 'in_app':
          await this.createInAppNotification(userId, notification);
          break;
        case 'both':
          await Promise.all([
            this.sendPushNotification(userId, notification, data),
            this.createInAppNotification(userId, notification)
          ]);
          break;
        default:
          logger.warn(`Unknown notification type: ${type}`);
          return { success: false };
      }

      return { success: true };
    } catch (error) {
      // Retry logic
      if (task.retries < this.maxRetries) {
        task.retries++;
        task.retryAt = new Date(Date.now() + Math.pow(2, task.retries) * 1000); // Exponential backoff

        // Add back to queue for retry
        this.queue.push(task);

        logger.debug('Notification task queued for retry', {
          type: task.type,
          userId: task.userId,
          retries: task.retries
        });
        return { success: false, retrying: true };
      } else {
        logger.error('Notification task failed permanently', {
          type: task.type,
          userId: task.userId,
          maxRetries: this.maxRetries,
          error: error.message
        });
        return { success: false, retrying: false };
      }
    }
  }

  // Send push notification
  async sendPushNotification(userId, notification, data = {}) {
    const User = require('../modules/User');

    // Check user preferences
    const user = await User.findById(userId).select('preferences deviceTokens');
    if (!user || !user.preferences?.notifications?.push) {
      return { success: false, reason: 'User not found or push notifications disabled' };
    }

    const deviceTokens = user.deviceTokens?.map(dt => dt.token) || [];
    if (deviceTokens.length === 0) {
      return { success: false, reason: 'No device tokens found' };
    }

    // Send via Firebase
    const response = await firebaseService.sendMulticastMessage(deviceTokens, notification, data);

    // Handle failed tokens in background
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(deviceTokens[idx]);
        }
      });

      // Remove failed tokens in background
      setImmediate(() => {
        deviceTokenService.removeFailedTokens(userId, failedTokens)
          .catch(error => logger.error('Background token cleanup failed:', error));
      });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  }

  // Create in-app notification
  async createInAppNotification(userId, notification) {
    const User = require('../modules/User');

    const newNotification = {
      ...notification,
      read: false,
      createdAt: new Date()
    };

    const result = await User.updateOne(
      { _id: userId },
      { $push: { notifications: newNotification } }
    );

    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }

    return { success: true, notification: newNotification };
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      batchSize: this.batchSize,
      maxRetries: this.maxRetries
    };
  }

  // Clear queue (for testing)
  clearQueue() {
    this.queue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  // Get failed notifications (for monitoring)
  getFailedNotifications() {
    return this.queue.filter(task => task.retries >= this.maxRetries);
  }

  // Async convenience methods
  async sendPushNotificationAsync(userId, notification, data = {}) {
    this.addToQueue({
      type: 'push',
      userId,
      notification,
      data
    });
  }

  async sendInAppNotificationAsync(userId, notification) {
    this.addToQueue({
      type: 'in_app',
      userId,
      notification
    });
  }

  async sendNotificationAsync(userId, notification, data = {}) {
    this.addToQueue({
      type: 'both',
      userId,
      notification,
      data
    });
  }
}

module.exports = new NotificationQueue();