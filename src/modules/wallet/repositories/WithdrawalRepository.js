/**
 * Withdrawal Repository Implementation
 * Infrastructure layer - Mongoose implementation
 */

const Withdrawal = require('../entities/Withdrawal.schema');

class WithdrawalRepository {
  async create(data) {
    const doc = await Withdrawal.create(data);
    return doc.toObject();
  }

  async findByPayoutReference(payoutReference) {
    const doc = await Withdrawal.findOne({ payoutReference });
    return doc ? doc.toObject() : null;
  }

  async findById(id) {
    const doc = await Withdrawal.findById(id);
    return doc ? doc.toObject() : null;
  }

  async updateStatus(id, status, extra = {}) {
    const doc = await Withdrawal.findByIdAndUpdate(
      id,
      { $set: { status, ...extra } },
      { new: true }
    );
    return doc ? doc.toObject() : null;
  }

  async findByUser(userId, options = {}) {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
    const docs = await Withdrawal.find({ user: userId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    return docs;
  }

  async findByOwner({ ownerType, ownerId, limit = 50, skip = 0 }) {
    const docs = await Withdrawal.find({ ownerType, ownerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return docs;
  }

  async findByQuery(query, options = {}) {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
    const docs = await Withdrawal.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    return docs;
  }

  async countByQuery(query) {
    return await Withdrawal.countDocuments(query);
  }

  /**
   * Find pending withdrawals for polling
   * @param {Object} options
   * @param {Date} options.createdBefore - Only get withdrawals created before this date
   * @param {number} options.limit - Maximum number of withdrawals to return
   * @returns {Promise<Array>}
   */
  async findPendingWithdrawals({ createdBefore, limit = 50 }) {
    const query = {
      status: 'pending'
    };

    if (createdBefore) {
      query.createdAt = { $lt: createdBefore };
    }

    const docs = await Withdrawal.find(query)
      .sort({ createdAt: 1 }) // Oldest first
      .limit(limit)
      .lean();

    return docs;
  }
}

module.exports = WithdrawalRepository;

