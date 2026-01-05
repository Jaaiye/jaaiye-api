/**
 * Email Queue
 * Processes emails asynchronously using domain EmailAdapters
 */

const logger = require('../../utils/logger');

// Lazy load adapters to avoid circular dependencies
let authEmailAdapter = null;
let ticketEmailAdapter = null;

function getAuthEmailAdapter() {
  if (!authEmailAdapter) {
    const EmailAdapter = require('../email/adapters/email.adapter');
    authEmailAdapter = new EmailAdapter();
  }
  return authEmailAdapter;
}

function getTicketEmailAdapter() {
  if (!ticketEmailAdapter) {
    const EmailAdapter = require('../email/adapters/email.adapter');
    ticketEmailAdapter = new EmailAdapter();
  }
  return ticketEmailAdapter;
}

class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = 5; // Process 5 emails at a time
    this.batchTimeout = 2000; // 2 seconds
    this.batchTimer = null;
    this.maxRetries = 3;
  }

  // Add email to queue (fire-and-forget)
  addToQueue(emailTask) {
    this.queue.push({
      ...emailTask,
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

    logger.info('Email added to queue', {
      type: emailTask.type,
      to: emailTask.to,
      queueLength: this.queue.length
    });
  }

  // Process queue in batches
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      // Process in batches
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);

        // Process batch concurrently
        const promises = batch.map(task => this.executeEmailTask(task));
        await Promise.allSettled(promises);
      }
    } catch (error) {
      logger.error('Error processing email queue:', error);
    } finally {
      this.processing = false;

      // If more items were added while processing, continue
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  // Execute individual email task
  async executeEmailTask(task) {
    try {
      const { type, to, data, retries } = task;

      logger.info('Processing email task', {
        type,
        to,
        retries,
        queueLength: this.queue.length
      });

      const authAdapter = getAuthEmailAdapter();
      const ticketAdapter = getTicketEmailAdapter();

      switch (type) {
        case 'verification':
          await authAdapter.sendVerificationEmail({
            to,
            name: data.name || 'User',
            code: data.verificationCode
          });
          break;
        case 'passwordReset':
          await authAdapter.sendPasswordResetEmail({
            to,
            name: data.name || 'User',
            code: data.resetCode
          });
          break;
        case 'welcome':
          await authAdapter.sendWelcomeEmail({
            to,
            name: data.name || 'User'
          });
          break;
        case 'accountDeactivation':
          // Note: This method doesn't exist in new EmailAdapter yet
          // For now, we'll log a warning and skip
          logger.warn('Account deactivation email not yet implemented in new EmailAdapter');
          break;
        case 'accountReactivation':
          // Note: This method doesn't exist in new EmailAdapter yet
          // For now, we'll log a warning and skip
          logger.warn('Account reactivation email not yet implemented in new EmailAdapter');
          break;
        case 'report':
          // Note: This method doesn't exist in new EmailAdapter yet
          // For now, we'll log a warning and skip
          logger.warn('Report email not yet implemented in new EmailAdapter');
          break;
        case 'ticket':
          // Payment confirmation email with tickets
          await ticketAdapter.sendPaymentConfirmationEmail(
            { email: to },
            data.ticketData
          );
          break;
        default:
          logger.warn(`Unknown email type: ${type}`);
          return;
      }

      logger.info('Email sent successfully', {
        type,
        to,
        retries
      });
    } catch (error) {
      logger.error('Email task failed', {
        type: task.type,
        to: task.to,
        error: error.message,
        retries: task.retries
      });

      // Retry logic
      if (task.retries < this.maxRetries) {
        task.retries++;
        task.retryAt = new Date(Date.now() + Math.pow(2, task.retries) * 1000); // Exponential backoff

        // Add back to queue for retry
        this.queue.push(task);

        logger.info('Email task queued for retry', {
          type: task.type,
          to: task.to,
          retries: task.retries,
          retryAt: task.retryAt
        });
      } else {
        logger.error('Email task failed permanently', {
          type: task.type,
          to: task.to,
          maxRetries: this.maxRetries
        });
      }
    }
  }

  // Convenience methods for different email types
  async sendVerificationEmailAsync(to, verificationCode, name = 'User') {
    this.addToQueue({
      type: 'verification',
      to,
      data: { verificationCode, name }
    });
  }

  async sendPasswordResetEmailAsync(to, resetCode, name = 'User') {
    this.addToQueue({
      type: 'passwordReset',
      to,
      data: { resetCode, name }
    });
  }

  async sendAccountDeactivationEmailAsync(to) {
    this.addToQueue({
      type: 'accountDeactivation',
      to
    });
  }

  async sendAccountReactivatedEmailAsync(to) {
    this.addToQueue({
      type: 'accountReactivation',
      to
    });
  }

  async sendWelcomeEmailAsync(to, name = 'User') {
    this.addToQueue({
      type: 'welcome',
      to,
      data: { name }
    });
  }

  async sendReportEmailAsync(to, reportData) {
    this.addToQueue({
      type: 'report',
      to,
      data: { reportData }
    });
  }

  async sendPaymentConfirmationEmailAsync(to, ticketData) {
    this.addToQueue({
      type: 'ticket',
      to,
      data: { ticketData }
    });
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

  // Get failed emails (for monitoring)
  getFailedEmails() {
    return this.queue.filter(task => task.retries >= this.maxRetries);
  }
}

module.exports = new EmailQueue();
