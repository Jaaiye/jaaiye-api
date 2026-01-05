/**
 * GetWalletDetailsUseCase
 * Read-only wallet view: balance + recent ledger entries.
 */

class GetWalletDetailsUseCase {
  constructor({ walletRepository, walletLedgerEntryRepository }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
  }

  /**
   * Execute the use case.
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'|'PLATFORM'} params.ownerType
   * @param {string|null} params.ownerId
   * @param {number} [params.limit=50]
   * @param {number} [params.skip=0]
   */
  async execute({ ownerType, ownerId, limit = 50, skip = 0 }) {
    if (!ownerType) {
      throw new Error('ownerType is required');
    }

    const wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      return {
        wallet: null,
        ledger: []
      };
    }

    const ledgerEntries = await this.walletLedgerEntryRepository.findByWallet(wallet.id, {
      limit,
      skip
    });

    return {
      wallet: wallet.toJSON ? wallet.toJSON() : wallet,
      ledger: ledgerEntries.map(entry => (entry.toJSON ? entry.toJSON() : entry))
    };
  }
}

module.exports = GetWalletDetailsUseCase;


