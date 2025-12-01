/**
 * Transaction Repository Interface
 * Domain layer - repository contract
 */

class ITransactionRepository {
  /**
   * Create a new transaction
   * @param {Object} transactionData
   * @returns {Promise<TransactionEntity>}
   */
  async create(transactionData) {
    throw new Error('Method not implemented');
  }

  /**
   * Find transaction by ID
   * @param {string} id
   * @returns {Promise<TransactionEntity|null>}
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find transaction by provider and reference
   * @param {string} provider
   * @param {string} reference
   * @returns {Promise<TransactionEntity|null>}
   */
  async findByProviderAndReference(provider, reference) {
    throw new Error('Method not implemented');
  }

  /**
   * Find transaction by reference
   * @param {string} reference
   * @returns {Promise<TransactionEntity|null>}
   */
  async findByReference(reference) {
    throw new Error('Method not implemented');
  }

  /**
   * Find transactions by user ID
   * @param {string} userId
   * @param {Object} options - limit, sort options
   * @returns {Promise<TransactionEntity[]>}
   */
  async findByUser(userId, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Find transactions by event ID
   * @param {string} eventId
   * @param {Object} options - limit, sort options
   * @returns {Promise<TransactionEntity[]>}
   */
  async findByEvent(eventId, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Update transaction
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<TransactionEntity>}
   */
  async update(id, updates) {
    throw new Error('Method not implemented');
  }

  /**
   * Find transactions with filters
   * @param {Object} filters
   * @param {Object} options - limit, skip, sort
   * @returns {Promise<{ transactions: TransactionEntity[], total: number }>}
   */
  async find(filters, options = {}) {
    throw new Error('Method not implemented');
  }
}

module.exports = ITransactionRepository;

