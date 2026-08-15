/**
 * WalletRepository
 * Mongoose implementation of IWalletRepository.
 */

const WalletSchema = require('../entities/Wallet.schema');
const WalletEntity = require('../entities/Wallet.entity');
const { IWalletRepository } = require('./interfaces');

class WalletRepository extends IWalletRepository {
  _toEntity(doc) {
    if (!doc) return null;
    const data = doc.toObject ? doc.toObject() : doc;
    return new WalletEntity({
      id: data._id?.toString() || data.id,
      ownerType: data.ownerType,
      ownerId: data.ownerId ? data.ownerId.toString() : null,
      balance: data.balance ? data.balance.toString() : '0.00',
      currency: data.currency,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  async create(walletData) {
    const doc = await WalletSchema.create(walletData);
    return this._toEntity(doc);
  }

  async findById(id) {
    const doc = await WalletSchema.findById(id);
    return this._toEntity(doc);
  }

  async findByOwner(ownerType, ownerId) {
    const doc = await WalletSchema.findOne({ ownerType, ownerId });
    return this._toEntity(doc);
  }

  /**
   * @deprecated Prefer credit()/debit() below. This does a blind absolute
   * $set - callers that compute newBalance from a previously-read balance
   * are vulnerable to lost updates when another credit/debit lands on the
   * same wallet concurrently (e.g. a withdrawal racing a ticket-sale
   * credit). Kept only for call sites not yet migrated.
   */
  async updateBalance(id, newBalance) {
    const doc = await WalletSchema.findByIdAndUpdate(
      id,
      { $set: { balance: newBalance } },
      { new: true }
    );
    return this._toEntity(doc);
  }

  /**
   * Atomically increase a wallet's balance. Safe under concurrent
   * credits/debits on the same wallet - MongoDB applies $inc atomically at
   * the document level, so no read-modify-write race is possible.
   * @param {string} id
   * @param {number} amount - must be positive
   * @returns {Promise<WalletEntity>}
   */
  async credit(id, amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('credit amount must be a positive number');
    }

    const doc = await WalletSchema.findByIdAndUpdate(
      id,
      { $inc: { balance: numericAmount } },
      { new: true }
    );
    return this._toEntity(doc);
  }

  /**
   * Atomically decrease a wallet's balance, but only if it currently holds
   * enough funds. The balance check and the decrement happen in a single
   * atomic findOneAndUpdate, so two concurrent debits for the same wallet
   * cannot both succeed against the same funds (unlike a separate
   * read-balance-then-$set, which allows both to pass the check before
   * either write lands).
   * @param {string} id
   * @param {number} amount - must be positive
   * @returns {Promise<WalletEntity|null>} null means insufficient balance
   */
  async debit(id, amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('debit amount must be a positive number');
    }

    const doc = await WalletSchema.findOneAndUpdate(
      { _id: id, balance: { $gte: numericAmount } },
      { $inc: { balance: -numericAmount } },
      { new: true }
    );
    return doc ? this._toEntity(doc) : null;
  }

  /**
   * Atomically apply a signed delta to a wallet's balance with no floor
   * check - unlike debit(), this can leave the balance negative. Use only
   * where that is the deliberate, accepted business rule (e.g. refunding a
   * wallet whose funds have already been partly withdrawn). Prefer
   * credit()/debit() for anything that must never go negative.
   * @param {string} id
   * @param {number} delta - positive or negative
   * @returns {Promise<WalletEntity>}
   */
  async incrementBalance(id, delta) {
    const numericDelta = Number(delta);
    if (!Number.isFinite(numericDelta)) {
      throw new Error('delta must be a finite number');
    }

    const doc = await WalletSchema.findByIdAndUpdate(
      id,
      { $inc: { balance: numericDelta } },
      { new: true }
    );
    return this._toEntity(doc);
  }

  async update(id, updateData) {
    const doc = await WalletSchema.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    return this._toEntity(doc);
  }
}

module.exports = WalletRepository;


