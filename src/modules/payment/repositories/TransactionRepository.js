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
      currency: data.currency,
      status: data.status,
      transId: data.transId,
      sessionId: data.sessionId,
      userId: data.userId,
      eventId: data.eventId,
      ticketTypeId: data.ticketTypeId,
      quantity: data.quantity,
      raw: data.raw,
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

