/**
 * SetDefaultBankAccountUseCase
 * - Marks a specific BankAccount as default for a user
 */

class SetDefaultBankAccountUseCase {
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

    const updated = await this.bankAccountRepository.setDefault(userId, bankAccountId);
    return updated;
  }
}

module.exports = SetDefaultBankAccountUseCase;


