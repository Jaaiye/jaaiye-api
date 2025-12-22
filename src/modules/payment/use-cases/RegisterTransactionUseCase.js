/**
 * Register Transaction Use Case
 * Application layer - business logic
 */

const { RegisterTransactionDTO } = require('../dto');
const { TransactionNotFoundError } = require('../errors');

class RegisterTransactionUseCase {
  constructor({ transactionRepository }) {
    this.transactionRepository = transactionRepository;
  }

  async execute(dto) {
    dto.validate();

    // Check if transaction already exists
    const existingTransaction = await this.transactionRepository.findByProviderAndReference(
      dto.provider,
      dto.reference
    );

    if (existingTransaction) {
      return {
        message: 'Transaction already registered',
        transaction: existingTransaction.toJSON()
      };
    }

    // Create new transaction
    const transaction = await this.transactionRepository.create({
      provider: dto.provider,
      reference: dto.reference,
      amount: dto.amount,
      currency: dto.currency,
      userId: dto.userId,
      eventId: dto.eventId,
      quantity: dto.quantity,
      status: dto.status || 'created',
      transId: dto.transId,
      ticketTypeId: dto.ticketTypeId
    });

    return {
      message: 'Transaction registered successfully',
      transaction: transaction.toJSON()
    };
  }
}

module.exports = RegisterTransactionUseCase;

