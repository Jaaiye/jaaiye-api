/**
 * DeleteBankAccountUseCase
 * - Removes a bank account belonging to the user
 * - If the deleted account was the default, promotes another remaining
 *   account (if any) so automatic payouts don't silently stop having
 *   anywhere to land
 */

class DeleteBankAccountUseCase {
  constructor({ bankAccountRepository }) {
    this.bankAccountRepository = bankAccountRepository;
  }

  async execute(userId, bankAccountId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!bankAccountId) {
      throw new Error('Bank account ID is required');
    }

    const account = await this.bankAccountRepository.findByIdForUser(bankAccountId, userId);
    if (!account) {
      throw new Error('Bank account not found for user');
    }

    await this.bankAccountRepository.delete(bankAccountId, userId);

    if (account.isDefault) {
      const remaining = await this.bankAccountRepository.findByUser(userId);
      if (remaining.length > 0) {
        await this.bankAccountRepository.setDefault(userId, remaining[0]._id);
      }
    }

    return { deleted: true };
  }
}

module.exports = DeleteBankAccountUseCase;
