/**
 * Get Withdrawal Details Use Case (Admin)
 * Application layer - admin-only: get detailed withdrawal information
 */

class GetWithdrawalDetailsUseCase {
  constructor({ withdrawalRepository, userRepository, walletRepository, bankAccountRepository, eventRepository, groupRepository }) {
    this.withdrawalRepository = withdrawalRepository;
    this.userRepository = userRepository;
    this.walletRepository = walletRepository;
    this.bankAccountRepository = bankAccountRepository;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
  }

  /**
   * Get detailed withdrawal information
   *
   * @param {Object} params
   * @param {string} params.withdrawalId
   */
  async execute({ withdrawalId }) {
    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    // Enrich with related entities
    const [user, wallet, bankAccount, owner] = await Promise.all([
      this.userRepository.findById(withdrawal.user).catch(() => null),
      this.walletRepository.findById(withdrawal.wallet).catch(() => null),
      withdrawal.bankAccount ? this.bankAccountRepository.findById(withdrawal.bankAccount).catch(() => null) : null,
      withdrawal.ownerType === 'EVENT'
        ? this.eventRepository.findById(withdrawal.ownerId).catch(() => null)
        : withdrawal.ownerType === 'GROUP'
        ? this.groupRepository.findById(withdrawal.ownerId).catch(() => null)
        : null
    ]);

    return {
      id: withdrawal._id || withdrawal.id,
      ownerType: withdrawal.ownerType,
      ownerId: withdrawal.ownerId,
      owner: owner ? {
        id: owner.id || owner._id,
        name: owner.title || owner.name,
        type: withdrawal.ownerType
      } : null,
      amount: withdrawal.amount,
      feeAmount: withdrawal.feeAmount,
      status: withdrawal.status,
      payoutReference: withdrawal.payoutReference,
      user: user ? {
        id: user.id || user._id,
        email: user.email,
        fullName: user.fullName,
        username: user.username
      } : { id: withdrawal.user },
      wallet: wallet ? {
        id: wallet.id || wallet._id,
        balance: Number(wallet.balance || 0),
        currency: wallet.currency
      } : { id: withdrawal.wallet },
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

