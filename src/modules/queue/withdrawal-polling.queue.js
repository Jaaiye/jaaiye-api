/**
 * Withdrawal Polling Queue
 * Background job to poll Flutterwave for pending withdrawal statuses
 * Provides redundancy in case webhooks fail
 */

const logger = require('../../utils/logger');

class WithdrawalPollingQueue {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        // Default to 5 minutes; can be overridden via env
        const defaultInterval = 5 * 60 * 1000;
        const envInterval = Number(process.env.WITHDRAWAL_POLL_INTERVAL_MS);
        this.pollingInterval = Number.isFinite(envInterval) && envInterval > 0 ? envInterval : defaultInterval;
        this._pollUseCase = null;
    }

    /**
     * Initialize polling use case (lazy loading to avoid circular dependencies)
     */
    _getPollUseCase() {
        if (!this._pollUseCase) {
            const walletModule = require('../wallet/wallet.module');
            this._pollUseCase = walletModule.getPollPendingWithdrawalsUseCase();
        }
        return this._pollUseCase;
    }

    // Start the polling job
    start() {
        if (this.isRunning) {
            logger.warn('Withdrawal polling queue is already running');
            return;
        }

        this.isRunning = true;
        logger.info('Starting withdrawal polling queue', { pollingIntervalMs: this.pollingInterval });

        // Run immediately on start
        this.pollPendingWithdrawals();

        // Schedule recurring polls
        this.intervalId = setInterval(() => {
            this.pollPendingWithdrawals();
        }, this.pollingInterval);
    }

    // Stop the polling job
    stop() {
        if (!this.isRunning) {
            logger.warn('Withdrawal polling queue is not running');
            return;
        }

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        logger.info('Withdrawal polling queue stopped');
    }

    // Poll for pending withdrawals
    async pollPendingWithdrawals() {
        try {
            const useCase = this._getPollUseCase();
            const summary = await useCase.execute();

            if (summary.totalFound > 0) {
                logger.info('Withdrawal polling job completed', {
                    found: summary.totalFound,
                    processed: summary.totalProcessed,
                    failed: summary.totalFailed,
                    skipped: summary.totalSkipped,
                    audit: {
                        processed: summary.audit.processed.length,
                        failed: summary.audit.failed.length,
                        skipped: summary.audit.skipped.length
                    }
                });
            } else {
                logger.debug('Withdrawal polling job completed: no pending withdrawals');
            }
        } catch (error) {
            logger.error('Error in withdrawal polling job', { error: error.message, stack: error.stack });
        }
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
        logger.info(`Withdrawal polling interval updated to ${intervalMs}ms`);

        // Restart if currently running
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
}

module.exports = new WithdrawalPollingQueue();
