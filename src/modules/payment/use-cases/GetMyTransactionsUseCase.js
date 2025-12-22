/**
 * Get My Transactions Use Case
 * Application layer - business logic
 */

class GetMyTransactionsUseCase {
  constructor({ transactionRepository }) {
    this.transactionRepository = transactionRepository;
  }

  async execute(userId) {
    const transactions = await this.transactionRepository.findByUser(userId, {
      limit: 200,
      sort: { createdAt: -1 }
    });

    return {
      transactions: transactions.map(t => t.toJSON())
    };
  }
}

module.exports = GetMyTransactionsUseCase;


