/**
 * Register Transaction Use Case
 * Application layer - business logic
 */

const { RegisterTransactionDTO } = require('../dto');
const { TransactionNotFoundError } = require('../errors');

class RegisterTransactionUseCase {
  constructor({ transactionRepository, eventRepository }) {
    this.transactionRepository = transactionRepository;
    this.eventRepository = eventRepository;
  }

  async execute(dto) {
    dto.validate();

    // Resolve eventId if it's a slug
    if (dto.eventId) {
      const event = await this.eventRepository.findByIdOrSlug(dto.eventId);
      if (event) {
        dto.eventId = event.id;
      }
    }

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
      baseAmount: dto.baseAmount,
      feeAmount: dto.feeAmount,
      currency: dto.currency,
      userId: dto.userId,
      eventId: dto.eventId,
      quantity: dto.quantity,
      status: dto.status || 'created',
      transId: dto.transId,
      ticketTypeId: dto.ticketTypeId,
      metadata: {
        ...(dto.metadata || {}),
        ticketTypes: dto.ticketTypes || []
      }
    });

    return {
      message: 'Transaction registered successfully',
      transaction: transaction.toJSON()
    };
  }
}

module.exports = RegisterTransactionUseCase;

