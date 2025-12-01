/**
 * Verify Flutterwave Payment Use Case
 * Application layer - business logic
 */

const { PaymentVerificationError } = require('../../domain/errors');

class VerifyFlutterwavePaymentUseCase {
  constructor({ flutterwaveAdapter }) {
    this.flutterwaveAdapter = flutterwaveAdapter;
  }

  async execute(reference) {
    try {
      const result = await this.flutterwaveAdapter.verify(reference);
      return { result };
    } catch (error) {
      throw new PaymentVerificationError(error.message || 'Failed to verify Flutterwave payment');
    }
  }
}

module.exports = VerifyFlutterwavePaymentUseCase;

