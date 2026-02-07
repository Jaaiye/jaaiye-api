/**
 * WalletWithdrawalService
 * Domain-level withdrawal logic (no payout provider integration yet).
 *
 * Responsibilities:
 * - Enforce who is allowed to withdraw from a wallet
 * - Validate balances
 * - Write withdrawal ledger entries
 *
 * Fee behaviour is intentionally open-ended for now (fee = 0).
 */

class WalletWithdrawalService {
  constructor({
    walletRepository,
    walletLedgerEntryRepository,
    eventRepository,
    groupRepository
  }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
  }

  /**
   * Check if a user can withdraw from a given wallet owner.
   * - EVENT: only user-origin events where creatorId === userId
   * - GROUP: only if group.creator === userId
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'} params.ownerType
   * @param {string} params.ownerId
   * @param {string} params.userId
   * @returns {Promise<boolean>}
   */
  async canUserWithdraw({ ownerType, ownerId, userId }) {
    if (!ownerType || !ownerId || !userId) return false;

    if (ownerType === 'EVENT') {
      const event = await this.eventRepository.findById(ownerId);
      if (!event) return false;
      return event.origin === 'user'
        && event.creatorId
        && String(event.creatorId) === String(userId);
    }

    if (ownerType === 'GROUP') {
      const group = await this.groupRepository.findById(ownerId);
      if (!group) return false;
      return group.creator
        && String(group.creator) === String(userId);
    }

    return false;
  }

  /**
   * Request a withdrawal (domain-only, no payout provider).
   *
   * For now:
   * - Fee is always 0 (feeMode reserved for future rules)
   * - Writes a single WITHDRAWAL/DEBIT ledger entry
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'} params.ownerType
   * @param {string} params.ownerId
   * @param {string} params.requestedBy - userId
   * @param {number} params.requestedAmount
   * @param {'NONE'|'INCLUSIVE'|'EXCLUSIVE'} [params.feeMode='NONE']
   */
  async requestWithdrawal({
    ownerType,
    ownerId,
    requestedBy,
    requestedAmount,
    feeMode = 'NONE'
  }) {
    if (!ownerType || !ownerId) {
      throw new Error('ownerType and ownerId are required');
    }
    if (!requestedBy) {
      throw new Error('requestedBy is required');
    }

    const amount = Number(requestedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('requestedAmount must be a positive number');
    }

    const allowed = await this.canUserWithdraw({ ownerType, ownerId, userId: requestedBy });
    if (!allowed) {
      throw new Error('You are not allowed to withdraw from this wallet');
    }

    const wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      throw new Error('Wallet not found for owner');
    }

    const currentBalance = Number(wallet.balance || 0);

    // Default fee logic: EVENT owners pay 5% service fee
    let feeAmount = 0;
    if (ownerType === 'EVENT') {
      feeAmount = amount * 0.05;
    }

    const totalDebit = amount; // The requested amount is the total debit from wallet
    const payoutAmount = amount - feeAmount; // Remaining is remitted

    if (currentBalance < totalDebit) {
      throw new Error('Insufficient wallet balance for withdrawal');
    }

    const walletBalanceAfter = currentBalance - totalDebit;

    // Update wallet balance
    const updatedWallet = await this.walletRepository.updateBalance(wallet.id, walletBalanceAfter);

    // Create ledger entry for withdrawal
    await this.walletLedgerEntryRepository.create({
      walletId: wallet.id,
      type: 'WITHDRAWAL',
      direction: 'DEBIT',
      amount: amount,
      balanceAfter: walletBalanceAfter,
      ownerType,
      ownerId,
      metadata: {
        requestedBy,
        feeMode,
        feeAmount,
        payoutAmount
      }
    });

    return {
      ownerType,
      ownerId,
      requestedBy,
      requestedAmount: amount,
      feeAmount,
      totalDebit,
      payoutAmount,
      walletBalanceAfter: Number(updatedWallet.balance || walletBalanceAfter)
    };
  }
}

module.exports = WalletWithdrawalService;


