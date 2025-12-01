/**
 * Initialize Paystack Payment Use Case
 * Application layer - business logic
 */

const { InitializePaymentDTO } = require('../dto');
const { PaymentInitializationError } = require('../../domain/errors');

class InitializePaystackPaymentUseCase {
  constructor({ paystackAdapter }) {
    this.paystackAdapter = paystackAdapter;
  }

  async execute(dto) {
    dto.validate();

    try {
      const metadata = {
        eventId: dto.eventId,
        quantity: dto.quantity,
        userId: dto.userId
      };

      const result = await this.paystackAdapter.initializePayment({
        amount: dto.amount,
        email: dto.email,
        metadata
      });

      return {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference
      };
    } catch (error) {
      throw new PaymentInitializationError(error.message || 'Failed to initialize Paystack payment');
    }
  }
}

module.exports = InitializePaystackPaymentUseCase;

