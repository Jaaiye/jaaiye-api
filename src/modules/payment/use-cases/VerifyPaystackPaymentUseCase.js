/**
 * Verify Paystack Payment Use Case
 * Application layer - business logic
 */

const { PaymentVerificationError } = require('../errors');

class VerifyPaystackPaymentUseCase {
  constructor({ paystackAdapter }) {
    this.paystackAdapter = paystackAdapter;
  }

  async execute(reference) {
    try {
      const result = await this.paystackAdapter.verify(reference);
      return { result };
    } catch (error) {
      throw new PaymentVerificationError(error.message || 'Failed to verify Paystack payment');
    }
  }
}

module.exports = VerifyPaystackPaymentUseCase;

