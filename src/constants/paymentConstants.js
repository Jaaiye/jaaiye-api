/**
 * Payment-related constants
 * These strings MUST remain unchanged to preserve API contracts
 */

const ERROR_MESSAGES = {
  MISSING_REQUIRED_FIELDS: 'Missing required fields: eventId and email are required',
  INVALID_AMOUNT: 'Valid amount is required',
  PAYSTACK_INIT_FAILED: 'Failed to initialize Paystack payment',
  FLUTTERWAVE_INIT_FAILED: 'Failed to initialize Flutterwave payment',
  PAYAZA_INIT_FAILED: 'Failed to initialize Payaza payment',
  MONNIFY_INIT_FAILED: 'Failed to initialize Monnify payment'
};

const WEBHOOK_RESPONSE = {
  RECEIVED: 'received',
  OK: 'ok'
};

const PAYMENT_PROVIDERS = {
  PAYSTACK: 'paystack',
  FLUTTERWAVE: 'flutterwave',
  PAYAZA: 'payaza',
  MONNIFY: 'monnify'
};

const DEFAULT_QUANTITY = 1;

module.exports = {
  ERROR_MESSAGES,
  WEBHOOK_RESPONSE,
  PAYMENT_PROVIDERS,
  DEFAULT_QUANTITY
};

