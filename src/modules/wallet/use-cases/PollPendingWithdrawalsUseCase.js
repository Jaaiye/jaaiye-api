/**
 * Poll Pending Withdrawals Use Case
 * Background job to check status of pending withdrawals
 * Provides redundancy in case webhooks fail
 */

const logger = require('../../../utils/logger');

class PollPendingWithdrawalsUseCase {
    constructor({
        withdrawalRepository,
        flutterwaveAdapter,
        processFlutterwaveTransferWebhookUseCase
    }) {
        this.withdrawalRepository = withdrawalRepository;
        this.flutterwaveAdapter = flutterwaveAdapter;
        this.processFlutterwaveTransferWebhookUseCase = processFlutterwaveTransferWebhookUseCase;
    }

    /**
     * Execute polling for pending withdrawals
     * @returns {Promise<Object>} Summary of polling results
     */
    async execute() {
        const summary = {
            totalFound: 0,
            totalProcessed: 0,
            totalFailed: 0,
            totalSkipped: 0,
            audit: {
                processed: [],
                failed: [],
                skipped: []
            }
        };

        try {
            // Find all pending withdrawals
            // Only check withdrawals that are at least 2 minutes old (to avoid race conditions with webhooks)
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const pendingWithdrawals = await this.withdrawalRepository.findPendingWithdrawals({
                createdBefore: twoMinutesAgo,
                limit: 50 // Process max 50 at a time
            });

            summary.totalFound = pendingWithdrawals.length;

            if (pendingWithdrawals.length === 0) {
                return summary;
            }

            logger.info(`Polling ${pendingWithdrawals.length} pending withdrawals`);

            // Process each withdrawal
            for (const withdrawal of pendingWithdrawals) {
                try {
                    // Get the Flutterwave transfer ID from metadata
                    const transferId = withdrawal.metadata?.flutterwaveTransferId;

                    if (!transferId) {
                        logger.warn('Withdrawal missing Flutterwave transfer ID', {
                            withdrawalId: withdrawal._id || withdrawal.id
                        });
                        summary.totalSkipped++;
                        summary.audit.skipped.push({
                            withdrawalId: withdrawal._id || withdrawal.id,
                            reason: 'missing_transfer_id'
                        });
                        continue;
                    }

                    // Verify transfer status with Flutterwave
                    const transferData = await this.flutterwaveAdapter.verifyTransfer(transferId);

                    if (!transferData) {
                        logger.warn('Failed to verify transfer with Flutterwave', {
                            withdrawalId: withdrawal._id || withdrawal.id,
                            transferId
                        });
                        summary.totalFailed++;
                        summary.audit.failed.push({
                            withdrawalId: withdrawal._id || withdrawal.id,
                            transferId,
                            reason: 'verification_failed'
                        });
                        continue;
                    }

                    // Check if status has changed
                    const currentStatus = transferData.status; // SUCCESSFUL, FAILED, PENDING, etc.

                    if (currentStatus === 'PENDING' || currentStatus === 'NEW') {
                        // Still pending, skip for now
                        summary.totalSkipped++;
                        summary.audit.skipped.push({
                            withdrawalId: withdrawal._id || withdrawal.id,
                            transferId,
                            status: currentStatus
                        });
                        continue;
                    }

                    // Status has changed - process it through the webhook handler
                    const webhookResult = {
                        ok: currentStatus === 'SUCCESSFUL',
                        provider: 'flutterwave',
                        type: 'transfer',
                        reference: withdrawal.payoutReference,
                        transferId: transferData.id,
                        failureReason: currentStatus === 'FAILED'
                            ? (transferData.complete_message || transferData.narration || 'Transfer failed')
                            : null,
                        raw: transferData
                    };

                    await this.processFlutterwaveTransferWebhookUseCase.execute(webhookResult);

                    summary.totalProcessed++;
                    summary.audit.processed.push({
                        withdrawalId: withdrawal._id || withdrawal.id,
                        transferId,
                        status: currentStatus,
                        polledAt: new Date()
                    });

                    logger.info('Withdrawal status updated via polling', {
                        withdrawalId: withdrawal._id || withdrawal.id,
                        transferId,
                        status: currentStatus
                    });

                } catch (error) {
                    logger.error('Error polling withdrawal', {
                        withdrawalId: withdrawal._id || withdrawal.id,
                        error: error.message
                    });
                    summary.totalFailed++;
                    summary.audit.failed.push({
                        withdrawalId: withdrawal._id || withdrawal.id,
                        error: error.message
                    });
                }
            }

        } catch (error) {
            logger.error('Error in withdrawal polling job', { error: error.message });
            throw error;
        }

        return summary;
    }
}

module.exports = PollPendingWithdrawalsUseCase;
