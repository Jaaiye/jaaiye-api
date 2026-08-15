/**
 * Transaction Repository Implementation
 * Infrastructure layer - Mongoose implementation
 */

const { TransactionEntity } = require('../entities');
const ITransactionRepository = require('./interfaces/ITransactionRepository');
const TransactionSchema = require('../entities/Transaction.schema');

class TransactionRepository extends ITransactionRepository {
  /**
   * Convert Mongoose document to TransactionEntity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;
    if (doc instanceof TransactionEntity) return doc;

    const data = doc.toObject ? doc.toObject() : doc;
    return new TransactionEntity({
      id: data._id || data.id,
      provider: data.provider,
      reference: data.reference,
      transReference: data.transReference,
      amount: data.amount,
      baseAmount: data.baseAmount,
      currency: data.currency,
      status: data.status,
      transId: data.transId,
      sessionId: data.sessionId,
      userId: data.userId,
      eventId: data.eventId,
      ticketTypeId: data.ticketTypeId,
      quantity: data.quantity,
      raw: data.raw,
      gatewayFee: data.gatewayFee,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  /**
   * Convert array of Mongoose documents to TransactionEntity array
   * @private
   */
  _toEntityArray(docs) {
    return docs.map(doc => this._toEntity(doc));
  }

  async create(transactionData) {
    const transaction = await TransactionSchema.create(transactionData);
    return this._toEntity(transaction);
  }

  async findById(id) {
    const transaction = await TransactionSchema.findById(id);
    return this._toEntity(transaction);
  }

  async findByProviderAndReference(provider, reference) {
    const transaction = await TransactionSchema.findOne({ provider, reference });
    return this._toEntity(transaction);
  }

  async findByReference(reference) {
    const transaction = await TransactionSchema.findOne({ reference });
    return this._toEntity(transaction);
  }

  async findByUser(userId, options = {}) {
    const { limit = 200, sort = { createdAt: -1 } } = options;
    const transactions = await TransactionSchema.find({ userId })
      .sort(sort)
      .limit(limit);
    return this._toEntityArray(transactions);
  }

  async findByEvent(eventId, options = {}) {
    const { limit = 500, sort = { createdAt: -1 } } = options;
    const transactions = await TransactionSchema.find({ eventId })
      .sort(sort)
      .limit(limit);
    return this._toEntityArray(transactions);
  }

  /**
   * Atomically claim a transaction for processing so that only one caller
   * (a webhook delivery, a retry of that webhook, or the pending-transaction
   * poller) proceeds to create tickets for a given provider+reference at a
   * time. Returns { transaction, claimed }. When claimed is false, the
   * caller must not do any processing work - the transaction is either
   * already successful or already being processed elsewhere right now.
   */
  async claimForProcessing({ provider, reference, defaults = {} }) {
    const claimed = await TransactionSchema.findOneAndUpdate(
      { provider, reference, status: { $nin: ['successful', 'processing'] } },
      { $set: { status: 'processing', updatedAt: new Date() } },
      { new: true }
    );

    if (claimed) {
      return { transaction: this._toEntity(claimed), claimed: true };
    }

    // Nothing claimable: either it doesn't exist yet, or it's already
    // successful / already being processed by another caller right now.
    const existing = await TransactionSchema.findOne({ provider, reference });
    if (existing) {
      return { transaction: this._toEntity(existing), claimed: false };
    }

    // Doesn't exist yet - create it directly in 'processing' state. The
    // unique (provider, reference) index guarantees only one concurrent
    // caller wins this insert; the loser falls back to the existing doc.
    try {
      const created = await TransactionSchema.create({
        ...defaults,
        provider,
        reference,
        status: 'processing'
      });
      return { transaction: this._toEntity(created), claimed: true };
    } catch (err) {
      if (err.code === 11000) {
        const raced = await TransactionSchema.findOne({ provider, reference });
        return { transaction: this._toEntity(raced), claimed: false };
      }
      throw err;
    }
  }

  async update(id, updates) {
    const transaction = await TransactionSchema.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    return this._toEntity(transaction);
  }

  async find(filters, options = {}) {
    const { limit = 500, skip = 0, sort = { createdAt: -1 } } = options;

    const [docs, total] = await Promise.all([
      TransactionSchema.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      TransactionSchema.countDocuments(filters)
    ]);

    return {
      transactions: this._toEntityArray(docs),
      total
    };
  }
}

module.exports = TransactionRepository;

