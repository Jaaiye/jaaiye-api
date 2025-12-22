/**
 * AddBankAccountUseCase
 * - Resolves bank account via Flutterwave
 * - Creates a verified BankAccount for the user
 * - Sets as default if user has no default yet
 */

class AddBankAccountUseCase {
  constructor({ bankAccountRepository, flutterwaveAdapter }) {
    this.bankAccountRepository = bankAccountRepository;
    this.flutterwaveAdapter = flutterwaveAdapter;
  }

  async execute(userId, { bankCode, bankName, accountNumber }) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!bankCode || !accountNumber || !bankName) {
      throw new Error('bankCode, bankName and accountNumber are required');
    }

    // Resolve account via Flutterwave
    const resolved = await this.flutterwaveAdapter.resolveBankAccount({
      accountNumber,
      bankCode
    });

    const existingDefault = await this.bankAccountRepository.findDefaultByUser(userId);

    const bankAccount = await this.bankAccountRepository.create({
      user: userId,
      bankName,
      bankCode: resolved.bankCode,
      accountNumber: resolved.accountNumber,
      accountName: resolved.accountName,
      isDefault: !existingDefault
    });

    return bankAccount;
  }
}

module.exports = AddBankAccountUseCase;


