/**
 * Process Flutterwave Transfer Webhook Use Case
 * Application layer - handles withdrawal completion webhooks
 */

const logger = require('../../../utils/logger');

class ProcessFlutterwaveTransferWebhookUseCase {
  constructor({
    withdrawalRepository,
    walletRepository,
    walletLedgerEntryRepository,
    bankAccountRepository,
    userRepository,
    eventRepository,
    groupRepository,
    walletNotificationService
  }) {
    this.withdrawalRepository = withdrawalRepository;
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
    this.bankAccountRepository = bankAccountRepository;
    this.userRepository = userRepository;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
    this.walletNotificationService = walletNotificationService;
  }

  async execute(webhookResult) {
    const { reference, transferId, ok, failureReason, raw } = webhookResult;

    // Use transferId or reference to find withdrawal
    const lookupKey = reference || transferId;

    if (!lookupKey) {
      logger.warn('Flutterwave transfer webhook missing reference or transferId');
      return { ok: false, reason: 'missing_reference' };
    }

    // Find withdrawal by payout reference (try both reference and transferId)
    let withdrawal = await this.withdrawalRepository.findByPayoutReference(reference);
    if (!withdrawal && transferId) {
      withdrawal = await this.withdrawalRepository.findByPayoutReference(transferId);
    }

    if (!withdrawal) {
      logger.warn('Withdrawal not found for payout reference', { reference, transferId });
      return { ok: false, reason: 'withdrawal_not_found' };
    }

    // Skip if already processed
    if (withdrawal.status !== 'pending') {
      logger.info('Withdrawal already processed', { withdrawalId: withdrawal._id, status: withdrawal.status });
      return { ok: true, alreadyProcessed: true };
    }

    // Load wallet first (needed for credit-back on failure)
    const wallet = await this.walletRepository.findById(withdrawal.wallet);
    if (!wallet) {
      logger.error('Wallet not found for withdrawal', { walletId: withdrawal.wallet });
      return { ok: false, reason: 'wallet_not_found' };
    }

    // Update withdrawal status
    const newStatus = ok ? 'successful' : 'failed';
    const updatedWithdrawal = await this.withdrawalRepository.updateStatus(
      withdrawal._id || withdrawal.id,
      newStatus,
      {
        metadata: {
          ...(withdrawal.metadata || {}),
          flutterwave: raw,
          processedAt: new Date()
        }
      }
    );

    if (!updatedWithdrawal) {
      logger.error('Failed to update withdrawal status', { withdrawalId: withdrawal._id });
      return { ok: false, reason: 'update_failed' };
    }

    // If withdrawal failed, credit the wallet back
    if (!ok) {
      try {
        const currentBalance = Number(wallet.balance || 0);
        const creditBackAmount = withdrawal.amount + (withdrawal.feeAmount || 0);
        const newBalance = currentBalance + creditBackAmount;

        await this.walletRepository.updateBalance(wallet.id, newBalance);

        // Create ledger entry for credit-back
        await this.walletLedgerEntryRepository.create({
          walletId: wallet.id,
          type: 'ADJUSTMENT',
          direction: 'CREDIT',
          amount: creditBackAmount,
          balanceAfter: newBalance,
          ownerType: withdrawal.ownerType,
          ownerId: withdrawal.ownerId,
          metadata: {
            reason: 'withdrawal_failed_credit_back',
            withdrawalId: withdrawal._id || withdrawal.id,
            originalAmount: withdrawal.amount,
            feeAmount: withdrawal.feeAmount || 0
          }
        });

        logger.info('Wallet credited back after failed withdrawal', {
          withdrawalId: withdrawal._id,
          creditBackAmount,
          newBalance
        });
      } catch (creditBackError) {
        logger.error('Failed to credit wallet back after failed withdrawal', {
          withdrawalId: withdrawal._id,
          error: creditBackError.message
        });
        // Continue with email notification even if credit-back fails
      }
    }

    // Load related entities for email
    const [updatedWallet, user, bankAccount] = await Promise.all([
      this.walletRepository.findById(withdrawal.wallet), // Refresh wallet balance
      this.userRepository.findById(withdrawal.user),
      this.bankAccountRepository.findById(withdrawal.bankAccount)
    ]);

    if (!updatedWallet || !user) {
      logger.error('Missing wallet or user for withdrawal email', {
        walletId: withdrawal.wallet,
        userId: withdrawal.user
      });
      return { ok: false, reason: 'missing_entities' };
    }

    // Determine owner label
    let ownerLabel = 'wallet';
    try {
      if (withdrawal.ownerType === 'EVENT') {
        const event = await this.eventRepository.findById(withdrawal.ownerId);
        ownerLabel = event ? event.title : 'event';
      } else if (withdrawal.ownerType === 'GROUP') {
        const group = await this.groupRepository.findById(withdrawal.ownerId);
        ownerLabel = group ? group.name : 'group';
      }
    } catch (error) {
      logger.warn('Failed to load owner for withdrawal email', { error: error.message });
    }

    // Send appropriate email
    try {
      if (ok) {
        // Success email
        const destinationMasked = bankAccount
          ? `${bankAccount.bankName} ••${bankAccount.accountNumber.slice(-4)}`
          : 'your bank account';

        await this.walletNotificationService.sendWithdrawalSuccessEmail({
          user,
          ownerLabel,
          payoutAmountNet: withdrawal.amount - (withdrawal.feeAmount || 0),
          feeAmount: withdrawal.feeAmount || 0,
          walletBalanceAfter: Number(updatedWallet.balance || 0),
          destinationMasked
        });

        logger.info('Withdrawal success email sent', { withdrawalId: withdrawal._id });
      } else {
        // Failure email
        await this.walletNotificationService.sendWithdrawalFailedEmail({
          user,
          ownerLabel,
          payoutAmountNet: withdrawal.amount - (withdrawal.feeAmount || 0),
          failureReason: failureReason || 'Transfer failed. Please contact support if this persists.'
        });

        logger.info('Withdrawal failure email sent', { withdrawalId: withdrawal._id });
      }
    } catch (emailError) {
      logger.error('Failed to send withdrawal email', {
        withdrawalId: withdrawal._id,
        error: emailError.message
      });
      // Don't fail the webhook processing if email fails
    }

    return {
      ok: true,
      withdrawalId: withdrawal._id || withdrawal.id,
      status: newStatus
    };
  }
}

module.exports = ProcessFlutterwaveTransferWebhookUseCase;

