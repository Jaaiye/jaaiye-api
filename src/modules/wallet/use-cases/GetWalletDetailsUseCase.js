/**
 * GetWalletDetailsUseCase
 * Read-only wallet view: balance + recent ledger entries + bank accounts.
 */

class GetWalletDetailsUseCase {
  constructor({ walletRepository, walletLedgerEntryRepository, bankAccountRepository }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
    this.bankAccountRepository = bankAccountRepository;
  }

  /**
   * Execute the use case.
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'|'PLATFORM'} params.ownerType
   * @param {string|null} params.ownerId
   * @param {string} params.userId - User ID to fetch bank accounts for
   * @param {number} [params.limit=50]
   * @param {number} [params.skip=0]
   */
  async execute({ ownerType, ownerId, userId, limit = 50, skip = 0 }) {
    if (!ownerType) {
      throw new Error('ownerType is required');
    }

    const wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      return {
        wallet: null,
        ledger: [],
        bankAccounts: []
      };
    }

    const ledgerEntries = await this.walletLedgerEntryRepository.findByWallet(wallet.id, {
      limit,
      skip
    });

    // Fetch user's bank accounts if userId is provided
    let bankAccounts = [];
    if (userId && this.bankAccountRepository) {
      try {
        bankAccounts = await this.bankAccountRepository.findByUser(userId);
      } catch (error) {
        console.warn('Failed to fetch bank accounts:', error.message);
      }
    }

    return {
      wallet: wallet.toJSON ? wallet.toJSON() : wallet,
      ledger: ledgerEntries.map(entry => (entry.toJSON ? entry.toJSON() : entry)),
      bankAccounts: bankAccounts.map(acc => (acc.toJSON ? acc.toJSON() : acc))
    };
  }
}

module.exports = GetWalletDetailsUseCase;


