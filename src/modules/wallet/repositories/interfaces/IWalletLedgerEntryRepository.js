/**
 * IWalletLedgerEntryRepository
 * Port interface for wallet ledger persistence.
 */

class IWalletLedgerEntryRepository {
  async create() {
    throw new Error('Not implemented');
  }

  async findByWallet() {
    throw new Error('Not implemented');
  }
}

module.exports = IWalletLedgerEntryRepository;


