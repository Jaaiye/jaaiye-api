/**
 * Get Withdrawals Use Case
 * Application layer - fetch withdrawal history
 */

class GetWithdrawalsUseCase {
  constructor({ withdrawalRepository, walletRepository }) {
    this.withdrawalRepository = withdrawalRepository;
    this.walletRepository = walletRepository;
  }

  /**
   * Get withdrawals for a wallet
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'} params.ownerType
   * @param {string} params.ownerId
   * @param {number} [params.limit=50]
   * @param {number} [params.skip=0]
   */
  async executeByWallet({ ownerType, ownerId, limit = 50, skip = 0 }) {
    const wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      return { withdrawals: [], total: 0 };
    }

    // Note: WithdrawalRepository doesn't have findByWallet yet, so we'll need to add it
    // For now, we can query by ownerType and ownerId
    const withdrawals = await this.withdrawalRepository.findByOwner({
      ownerType,
      ownerId,
      limit,
      skip
    });

    return {
      withdrawals: withdrawals.map(w => ({
        id: w._id || w.id,
        amount: w.amount,
        feeAmount: w.feeAmount,
        status: w.status,
        payoutReference: w.payoutReference,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      })),
      total: withdrawals.length,
      limit,
      skip
    };
  }

  /**
   * Get withdrawals for a user
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {number} [params.limit=50]
   * @param {number} [params.skip=0]
   */
  async executeByUser({ userId, limit = 50, skip = 0 }) {
    const withdrawals = await this.withdrawalRepository.findByUser(userId, {
      limit,
      skip,
      sort: { createdAt: -1 }
    });

    return {
      withdrawals: withdrawals.map(w => ({
        id: w._id || w.id,
        ownerType: w.ownerType,
        ownerId: w.ownerId,
        amount: w.amount,
        feeAmount: w.feeAmount,
        status: w.status,
        payoutReference: w.payoutReference,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      })),
      total: withdrawals.length,
      limit,
      skip
    };
  }
}

module.exports = GetWithdrawalsUseCase;

