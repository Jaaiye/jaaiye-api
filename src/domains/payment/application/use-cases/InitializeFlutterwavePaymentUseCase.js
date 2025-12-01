/**
 * Initialize Flutterwave Payment Use Case
 * Application layer - business logic
 */

const { InitializePaymentDTO } = require('../dto');
const { PaymentInitializationError } = require('../../domain/errors');

class InitializeFlutterwavePaymentUseCase {
  constructor({ flutterwaveAdapter }) {
    this.flutterwaveAdapter = flutterwaveAdapter;
  }

  async execute(dto, idempotencyKey) {
    dto.validate();

    try {
      const metadata = {
        eventId: dto.eventId,
        quantity: dto.quantity,
        userId: dto.userId
      };

      const result = await this.flutterwaveAdapter.initializePayment({
        amount: dto.amount,
        email: dto.email,
        metadata,
        idempotencyKey
      });

      return {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        idempotencyKey: result.idempotencyKey,
        isCachedResponse: result.isCachedResponse
      };
    } catch (error) {
      throw new PaymentInitializationError(error.message || 'Failed to initialize Flutterwave payment');
    }
  }
}

module.exports = InitializeFlutterwavePaymentUseCase;

