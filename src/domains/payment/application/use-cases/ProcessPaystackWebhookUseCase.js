/**
 * Process Paystack Webhook Use Case
 * Application layer - business logic
 */

const { InvalidWebhookSignatureError } = require('../../domain/errors');

class ProcessPaystackWebhookUseCase {
  constructor({ paystackAdapter, paymentService }) {
    this.paystackAdapter = paystackAdapter;
    this.paymentService = paymentService;
  }

  async execute(headers, body) {
    const result = await this.paystackAdapter.processWebhook(headers, body);

    if (!result.ok) {
      return result;
    }

    // Handle successful payment
    return await this.paymentService.handleSuccessfulPayment(result);
  }
}

module.exports = ProcessPaystackWebhookUseCase;

