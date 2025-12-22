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

    // Calculate fee that was originally charged (10% of original amount)
    const originalFee = originalAmount * 0.10;
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

    // Compute new balances
    const walletBalanceBefore = Number(wallet.balance || 0);
    const platformBalanceBefore = Number(platformWallet.balance || 0);

    const walletBalanceAfter = walletBalanceBefore - netToDebit;
    const platformBalanceAfter = platformBalanceBefore - feeToRefund;

    // Validate balances (shouldn't go negative, but allow for edge cases)
    if (walletBalanceAfter < 0) {
      console.warn(`Wallet balance would go negative after refund: ${walletBalanceAfter}`);
    }
    if (platformBalanceAfter < 0) {
      console.warn(`Platform wallet balance would go negative after refund: ${platformBalanceAfter}`);
    }

    // Update balances
    await this.walletRepository.updateBalance(wallet.id, Math.max(0, walletBalanceAfter));
    await this.walletRepository.updateBalance(platformWallet.id, Math.max(0, platformBalanceAfter));

    // Create ledger entries
    await this.walletLedgerEntryRepository.create({
      walletId: wallet.id,
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
      amount: netToDebit,
      balanceAfter: Math.max(0, walletBalanceAfter),
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
      balanceAfter: Math.max(0, platformBalanceAfter),
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
      walletBalanceAfter: Math.max(0, walletBalanceAfter),
      platformBalanceAfter: Math.max(0, platformBalanceAfter),
      netDebited: netToDebit,
      feeRefunded: feeToRefund
    };
  }
}

module.exports = WalletRefundService;

