/**
 * WalletRepository
 * Mongoose implementation of IWalletRepository.
 */

const mongoose = require('mongoose');
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
      heldForPayout: data.heldForPayout ? data.heldForPayout.toString() : '0.00',
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

  /**
   * List all active wallets of a given owner type whose live balance
   * exceeds minBalance. Used by the weekly hold job to find wallets
   * eligible to have funds locked in for the next payout run.
   * @param {'EVENT'|'GROUP'} ownerType
   * @param {number} minBalance
   * @returns {Promise<WalletEntity[]>}
   */
  async findAllByOwnerTypeWithBalance(ownerType, minBalance = 0) {
    const docs = await WalletSchema.find({
      ownerType,
      isActive: true,
      balance: { $gt: mongoose.Types.Decimal128.fromString(String(minBalance)) }
    });
    return docs.map(doc => this._toEntity(doc));
  }

  /**
   * List all active wallets of a given owner type that currently have an
   * amount held for payout. Used by the weekly payout job.
   * @param {'EVENT'|'GROUP'} ownerType
   * @returns {Promise<WalletEntity[]>}
   */
  async findAllByOwnerTypeWithHeldBalance(ownerType) {
    const docs = await WalletSchema.find({
      ownerType,
      isActive: true,
      heldForPayout: { $gt: mongoose.Types.Decimal128.fromString('0') }
    });
    return docs.map(doc => this._toEntity(doc));
  }

  /**
   * Atomically move a wallet's entire current balance into heldForPayout,
   * but only if the balance currently exceeds minHoldAmount. Uses a
   * pipeline update so "set heldForPayout to whatever balance currently
   * is" happens as a single atomic operation - no read-then-write window
   * where a concurrent credit could be lost or double-counted.
   * @param {string} id
   * @param {number} minHoldAmount
   * @returns {Promise<WalletEntity|null>} null if nothing was eligible to hold
   */
  async holdBalanceForPayout(id, minHoldAmount = 0) {
    const doc = await WalletSchema.findOneAndUpdate(
      {
        _id: id,
        balance: { $gt: mongoose.Types.Decimal128.fromString(String(minHoldAmount)) }
      },
      [
        { $set: { heldForPayout: { $add: ['$heldForPayout', '$balance'] } } },
        { $set: { balance: mongoose.Types.Decimal128.fromString('0') } }
      ],
      { new: true }
    );
    return doc ? this._toEntity(doc) : null;
  }

  /**
   * Atomically decrease heldForPayout, but only if it currently holds
   * enough. Mirrors debit() but operates on heldForPayout instead of
   * balance - used when a scheduled payout actually executes.
   * @param {string} id
   * @param {number} amount
   * @returns {Promise<WalletEntity|null>} null means insufficient held balance
   */
  async debitHeldBalance(id, amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('debit amount must be a positive number');
    }

    const doc = await WalletSchema.findOneAndUpdate(
      { _id: id, heldForPayout: { $gte: numericAmount } },
      { $inc: { heldForPayout: -numericAmount } },
      { new: true }
    );
    return doc ? this._toEntity(doc) : null;
  }

  /**
   * Atomically credit heldForPayout back - used to roll back a hold when
   * a scheduled payout's transfer fails, so the amount is retried on the
   * next payout run without waiting for another hold cycle.
   * @param {string} id
   * @param {number} amount
   * @returns {Promise<WalletEntity>}
   */
  async creditHeldBalance(id, amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('credit amount must be a positive number');
    }

    const doc = await WalletSchema.findByIdAndUpdate(
      id,
      { $inc: { heldForPayout: numericAmount } },
      { new: true }
    );
    return this._toEntity(doc);
  }
}

module.exports = WalletRepository;


