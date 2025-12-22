/**
 * Get Withdrawal Details Use Case
 * Application layer - fetch single withdrawal details
 */

class GetWithdrawalDetailsUseCase {
  constructor({ withdrawalRepository, walletRepository, bankAccountRepository }) {
    this.withdrawalRepository = withdrawalRepository;
    this.walletRepository = walletRepository;
    this.bankAccountRepository = bankAccountRepository;
  }

  /**
   * Get withdrawal details by ID
   *
   * @param {Object} params
   * @param {string} params.withdrawalId
   * @param {string} [params.userId] - Optional: verify ownership if provided
   */
  async execute({ withdrawalId, userId }) {
    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    // If userId provided, verify ownership
    if (userId && String(withdrawal.user) !== String(userId)) {
      throw new Error('Withdrawal not found or access denied');
    }

    // Get bank account details
    let bankAccount = null;
    if (withdrawal.bankAccount) {
      bankAccount = await this.bankAccountRepository.findById(withdrawal.bankAccount);
    }

    return {
      id: withdrawal._id || withdrawal.id,
      ownerType: withdrawal.ownerType,
      ownerId: withdrawal.ownerId,
      amount: withdrawal.amount,
      feeAmount: withdrawal.feeAmount,
      status: withdrawal.status,
      payoutReference: withdrawal.payoutReference,
      bankAccount: bankAccount ? {
        bankName: bankAccount.bankName,
        accountNumber: `••${bankAccount.accountNumber.slice(-4)}`,
        accountName: bankAccount.accountName
      } : null,
      metadata: withdrawal.metadata || {},
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt
    };
  }
}

module.exports = GetWithdrawalDetailsUseCase;

