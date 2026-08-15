/**
 * WalletRefundService
 * Domain-level refund handling logic.
 *
 * When a refund/chargeback occurs:
 * - Debit the event/group wallet by the net amount (original amount - fee)
 * - Debit the platform wallet by the fee amount (refund the fee)
 * - Create ADJUSTMENT ledger entries
 */

class WalletRefundService {
  constructor({ walletRepository, walletLedgerEntryRepository }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
  }

  /**
   * Process a refund/chargeback for a transaction.
   * Debits both the owner wallet and platform wallet proportionally.
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'} params.ownerType
   * @param {string} params.ownerId
   * @param {Object} params.transactionEntity - Original transaction
   * @param {number} params.refundAmount - Amount being refunded (should match original)
   * @param {string} [params.reason] - Reason for refund
   * @param {string} [params.refundReference] - External refund reference
   */
  async processRefund({ ownerType, ownerId, transactionEntity, refundAmount, reason, refundReference }) {
    if (!transactionEntity || !transactionEntity.id) {
      throw new Error('transactionEntity with id is required');
    }

    const originalAmount = Number(transactionEntity.amount);
    const refundAmountNum = Number(refundAmount);

    if (!Number.isFinite(refundAmountNum) || refundAmountNum <= 0) {
      throw new Error('Invalid refund amount');
    }

    if (refundAmountNum > originalAmount) {
      throw new Error('Refund amount cannot exceed original transaction amount');
    }

    // Calculate fee that was originally charged (5% of original amount if not stored)
    const originalFee = Number(transactionEntity.feeAmount) !== undefined && transactionEntity.feeAmount !== null
      ? Number(transactionEntity.feeAmount)
      : originalAmount * 0.05;
    const originalNet = originalAmount - originalFee;

    // For refunds, we debit proportionally:
    // - Owner wallet: debit the net amount that was credited
    // - Platform wallet: debit the fee that was collected
    const feeToRefund = (refundAmountNum / originalAmount) * originalFee;
    const netToDebit = refundAmountNum - feeToRefund;

    // Get owner wallet
    const wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      throw new Error(`Wallet not found for ${ownerType} ${ownerId}`);
    }

    // Get platform wallet
    const platformWallet = await this.walletRepository.findByOwner('PLATFORM', null);
    if (!platformWallet) {
      throw new Error('Platform wallet not found');
    }

    // Apply balance changes atomically. A refund can legitimately push a
    // wallet negative (e.g. the organizer already withdrew the funds being
    // refunded) - that's an accepted business edge case here, so this uses
    // the no-floor atomic increment rather than debit()'s insufficient-funds
    // guard. It's still atomic, so it no longer loses updates to a
    // concurrent credit/debit on the same wallet the way a stale
    // read-then-$set would.
    const updatedWallet = await this.walletRepository.incrementBalance(wallet.id, -netToDebit);
    const updatedPlatformWallet = await this.walletRepository.incrementBalance(platformWallet.id, -feeToRefund);

    const walletBalanceAfter = Number(updatedWallet.balance);
    const platformBalanceAfter = Number(updatedPlatformWallet.balance);

    if (walletBalanceAfter < 0) {
      console.warn(`Wallet balance went negative after refund: ${walletBalanceAfter}`);
    }
    if (platformBalanceAfter < 0) {
      console.warn(`Platform wallet balance went negative after refund: ${platformBalanceAfter}`);
    }

    // Create ledger entries
    await this.walletLedgerEntryRepository.create({
      walletId: wallet.id,
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      amount: netToDebit,
      balanceAfter: walletBalanceAfter,
      ownerType,
      ownerId,
      transactionId: transactionEntity.id,
      externalReference: refundReference || transactionEntity.reference,
      metadata: {
        reason: reason || 'refund',
        refundAmount: refundAmountNum,
        originalAmount,
        originalFee,
        feeRefunded: feeToRefund
      }
    });

    await this.walletLedgerEntryRepository.create({
      walletId: platformWallet.id,
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      amount: feeToRefund,
      balanceAfter: platformBalanceAfter,
      ownerType: 'PLATFORM',
      ownerId: null,
      transactionId: transactionEntity.id,
      externalReference: refundReference || transactionEntity.reference,
      metadata: {
        reason: reason || 'refund_fee',
        refundAmount: refundAmountNum,
        originalAmount,
        feeRefunded: feeToRefund,
        sourceOwnerType: ownerType,
        sourceOwnerId: ownerId
      }
    });

    return {
      walletBalanceAfter,
      platformBalanceAfter,
      netDebited: netToDebit,
      feeRefunded: feeToRefund
    };
  }
}

module.exports = WalletRefundService;

