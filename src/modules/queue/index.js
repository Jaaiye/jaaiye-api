/**
 * Queue Module Exports
 */

const queueModule = require('./queue.module');

module.exports = {
  emailQueue: queueModule.getEmailQueue(),
  notificationQueue: queueModule.getNotificationQueue(),
  paymentPollingQueue: queueModule.getPaymentPollingQueue()
};
