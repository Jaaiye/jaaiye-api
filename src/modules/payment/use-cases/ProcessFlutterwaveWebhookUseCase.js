/**
 * Process Flutterwave Webhook Use Case
 * Application layer - business logic
 */

const { InvalidWebhookSignatureError } = require('../errors');

class ProcessFlutterwaveWebhookUseCase {
  constructor({
    flutterwaveAdapter,
    paymentService,
    processFlutterwaveTransferWebhookUseCase,
    processRefundWebhookUseCase
  }) {
    this.flutterwaveAdapter = flutterwaveAdapter;
    this.paymentService = paymentService;
    this.processFlutterwaveTransferWebhookUseCase = processFlutterwaveTransferWebhookUseCase;
    this.processRefundWebhookUseCase = processRefundWebhookUseCase;
  }

  async execute(headers, body) {
    const result = await this.flutterwaveAdapter.processWebhook(headers, body);

    if (!result.ok) {
      return result;
    }

    // Route transfer events to withdrawal handler
    if (result.type === 'transfer') {
      if (this.processFlutterwaveTransferWebhookUseCase) {
        return await this.processFlutterwaveTransferWebhookUseCase.execute(result);
      }
      // If transfer handler not available, just acknowledge
      return { ok: true, type: 'transfer', acknowledged: true };
    }

    // Route refund events to refund handler
    if (result.type === 'refund') {
      if (this.processRefundWebhookUseCase) {
        return await this.processRefundWebhookUseCase.execute(result);
      }
      // If refund handler not available, just acknowledge
      return { ok: true, type: 'refund', acknowledged: true };
    }

    // Handle successful payment (charge events)
    return await this.paymentService.handleSuccessfulPayment(result);
  }
}

module.exports = ProcessFlutterwaveWebhookUseCase;

