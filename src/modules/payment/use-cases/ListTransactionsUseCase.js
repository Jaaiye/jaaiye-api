/**
 * List Transactions Use Case (Admin)
 * Application layer - business logic
 */

class ListTransactionsUseCase {
  constructor({ transactionRepository }) {
    this.transactionRepository = transactionRepository;
  }

  async execute(filters = {}) {
    const { status, provider } = filters;
    const queryFilters = {};

    if (status) queryFilters.status = status;
    if (provider) queryFilters.provider = provider;

    const result = await this.transactionRepository.find(queryFilters, {
      limit: 500,
      sort: { createdAt: -1 }
    });

    return {
      transactions: result.transactions.map(t => t.toJSON()),
      total: result.total
    };
  }
}

module.exports = ListTransactionsUseCase;


