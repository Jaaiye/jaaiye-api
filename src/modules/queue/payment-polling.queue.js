/**
 * Payment Polling Queue
 * Background job to poll payment providers for pending transactions
 * Uses new Payment domain services
 */

const logger = require('../../utils/logger');
const paymentModule = require('../payment/payment.module');
const { PollPendingTransactionsUseCase } = require('../payment/use-cases');

class PaymentPollingQueue {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    // Default to 3 minutes; can be overridden via env
    const defaultInterval = 3 * 60 * 1000;
    const envInterval = Number(process.env.PAYMENT_POLL_INTERVAL_MS);
    this.pollingInterval = Number.isFinite(envInterval) && envInterval > 0 ? envInterval : defaultInterval;
    this._pollUseCase = null;
    this.paymentModule = paymentModule;
  }

  /**
   * Initialize polling use case
   */
  _getPollUseCase() {
    if (!this._pollUseCase) {
      this._pollUseCase = new PollPendingTransactionsUseCase({
        transactionRepository: this.paymentModule.getTransactionRepository(),
        paystackAdapter: this.paymentModule.getPaystackAdapter(),
        flutterwaveAdapter: this.paymentModule.getFlutterwaveAdapter(),
        payazaAdapter: this.paymentModule.getPayazaAdapter(),
        monnifyAdapter: this.paymentModule.getMonnifyAdapter(),
        paymentService: this.paymentModule.getPaymentService()
      });
    }
    return this._pollUseCase;
  }

  // Start the polling job
  start() {
    if (this.isRunning) {
      logger.warn('Payment polling queue is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting payment polling queue', { pollingIntervalMs: this.pollingInterval });

    // Run immediately on start
    this.pollPendingTransactions();

    // Schedule recurring polls
    this.intervalId = setInterval(() => {
      this.pollPendingTransactions();
    }, this.pollingInterval);
  }

  // Stop the polling job
  stop() {
    if (!this.isRunning) {
      logger.warn('Payment polling queue is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Payment polling queue stopped');
  }

  // Poll for pending transactions
  async pollPendingTransactions() {
    const useCase = this._getPollUseCase();
    await useCase.execute();
  }

  // Get queue status
  getStatus() {
    return {
      isRunning: this.isRunning,
      pollingInterval: this.pollingInterval,
      nextPoll: this.isRunning ? new Date(Date.now() + this.pollingInterval) : null
    };
  }

  // Update polling interval
  setPollingInterval(intervalMs) {
    this.pollingInterval = intervalMs;
    logger.info(`Payment polling interval updated to ${intervalMs}ms`);

    // Restart if currently running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

module.exports = new PaymentPollingQueue();
