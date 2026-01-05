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
}

module.exports = IWalletRepository;


