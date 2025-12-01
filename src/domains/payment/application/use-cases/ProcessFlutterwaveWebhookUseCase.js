/**
 * Process Flutterwave Webhook Use Case
 * Application layer - business logic
 */

const { InvalidWebhookSignatureError } = require('../../domain/errors');

class ProcessFlutterwaveWebhookUseCase {
  constructor({ flutterwaveAdapter, paymentService }) {
    this.flutterwaveAdapter = flutterwaveAdapter;
    this.paymentService = paymentService;
  }

  async execute(headers, body) {
    const result = await this.flutterwaveAdapter.processWebhook(headers, body);

    if (!result.ok) {
      return result;
    }

    // Handle successful payment
    return await this.paymentService.handleSuccessfulPayment(result);
  }
}

module.exports = ProcessFlutterwaveWebhookUseCase;

