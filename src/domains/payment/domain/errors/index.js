const { AppError } = require('../../../../utils/errors');

class TransactionNotFoundError extends AppError {
  constructor(message = 'Transaction not found') {
    super(message, 404);
    this.name = 'TransactionNotFoundError';
  }
}

class InvalidPaymentProviderError extends AppError {
  constructor(message = 'Invalid payment provider') {
    super(message, 400);
    this.name = 'InvalidPaymentProviderError';
  }
}

class PaymentInitializationError extends AppError {
  constructor(message = 'Failed to initialize payment') {
    super(message, 500);
    this.name = 'PaymentInitializationError';
  }
}

class PaymentVerificationError extends AppError {
  constructor(message = 'Failed to verify payment') {
    super(message, 500);
    this.name = 'PaymentVerificationError';
  }
}

class InvalidWebhookSignatureError extends AppError {
  constructor(message = 'Invalid webhook signature') {
    super(message, 401);
    this.name = 'InvalidWebhookSignatureError';
  }
}

module.exports = {
  TransactionNotFoundError,
  InvalidPaymentProviderError,
  PaymentInitializationError,
  PaymentVerificationError,
  InvalidWebhookSignatureError
};

