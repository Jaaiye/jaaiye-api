/**
 * WalletLedgerEntryRepository
 * Mongoose implementation of IWalletLedgerEntryRepository.
 */

const WalletLedgerEntrySchema = require('../entities/WalletLedgerEntry.schema');
const WalletLedgerEntryEntity = require('../entities/WalletLedgerEntry.entity');
const { IWalletLedgerEntryRepository } = require('./interfaces');

class WalletLedgerEntryRepository extends IWalletLedgerEntryRepository {
  _toEntity(doc) {
    if (!doc) return null;
    const data = doc.toObject ? doc.toObject() : doc;
    return new WalletLedgerEntryEntity({
      id: data._id?.toString() || data.id,
      walletId: data.walletId?.toString(),
      type: data.type,
      direction: data.direction,
      amount: data.amount ? data.amount.toString() : '0.00',
      balanceAfter: data.balanceAfter ? data.balanceAfter.toString() : null,
      ownerType: data.ownerType,
      ownerId: data.ownerId ? data.ownerId.toString() : null,
      transactionId: data.transactionId ? data.transactionId.toString() : null,
      hangoutId: data.hangoutId ? data.hangoutId.toString() : null,
      externalReference: data.externalReference || null,
      metadata: data.metadata || {},
      createdAt: data.createdAt
    });
  }

  async create(entryData) {
    const doc = await WalletLedgerEntrySchema.create(entryData);
    return this._toEntity(doc);
  }

  async findByWallet(walletId, options = {}) {
    const { limit = 100, skip = 0 } = options;
    const docs = await WalletLedgerEntrySchema
      .find({ walletId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return docs.map(doc => this._toEntity(doc));
  }
}

module.exports = WalletLedgerEntryRepository;


