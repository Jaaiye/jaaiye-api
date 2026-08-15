/**
 * IWalletRepository
 * Port interface for wallet persistence.
 */

class IWalletRepository {
  async create() {
    throw new Error('Not implemented');
  }

  async findById() {
    throw new Error('Not implemented');
  }

  async findByOwner() {
    throw new Error('Not implemented');
  }

  /** Atomically increase balance by amount. */
  async credit() {
    throw new Error('Not implemented');
  }

  /** Atomically decrease balance by amount if sufficient funds exist; returns null otherwise. */
  async debit() {
    throw new Error('Not implemented');
  }
}

module.exports = IWalletRepository;


