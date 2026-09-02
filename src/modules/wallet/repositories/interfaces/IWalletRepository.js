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

  /** List wallets of an owner type whose balance exceeds minBalance. */
  async findAllByOwnerTypeWithBalance() {
    throw new Error('Not implemented');
  }

  /** List wallets of an owner type that currently have an amount held for payout. */
  async findAllByOwnerTypeWithHeldBalance() {
    throw new Error('Not implemented');
  }

  /** Atomically move a wallet's entire balance into heldForPayout if it exceeds minHoldAmount. */
  async holdBalanceForPayout() {
    throw new Error('Not implemented');
  }

  /** Atomically decrease heldForPayout by amount if sufficient; returns null otherwise. */
  async debitHeldBalance() {
    throw new Error('Not implemented');
  }

  /** Atomically increase heldForPayout by amount. */
  async creditHeldBalance() {
    throw new Error('Not implemented');
  }
}

module.exports = IWalletRepository;


