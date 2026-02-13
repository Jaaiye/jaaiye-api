/**
 * Queue Module
 * Dependency Injection container for Queue domain
 */

const EmailQueue = require('./email.queue');
const NotificationQueue = require('./notification.queue');
const PaymentPollingQueue = require('./payment-polling.queue');
const WithdrawalPollingQueue = require('./withdrawal-polling.queue');
const UptimeMonitor = require('./uptime.monitor');

class QueueModule {
  constructor() {
    this._instances = {};
  }

  getEmailQueue() {
    if (!this._instances.emailQueue) {
      this._instances.emailQueue = EmailQueue;
    }
    return this._instances.emailQueue;
  }

  getNotificationQueue() {
    if (!this._instances.notificationQueue) {
      this._instances.notificationQueue = NotificationQueue;
    }
    return this._instances.notificationQueue;
  }

  getPaymentPollingQueue() {
    if (!this._instances.paymentPollingQueue) {
      this._instances.paymentPollingQueue = PaymentPollingQueue;
    }
    return this._instances.paymentPollingQueue;
  }

  getWithdrawalPollingQueue() {
    if (!this._instances.withdrawalPollingQueue) {
      this._instances.withdrawalPollingQueue = WithdrawalPollingQueue;
    }
    return this._instances.withdrawalPollingQueue;
  }

  getUptimeMonitor() {
    if (!this._instances.uptimeMonitor) {
      this._instances.uptimeMonitor = UptimeMonitor;
    }
    return this._instances.uptimeMonitor;
  }
}

module.exports = new QueueModule();

