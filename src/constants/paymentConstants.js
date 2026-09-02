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

// Platform service fee charged on ticket sales / wallet funding.
// Added on top of the ticket price at checkout - the buyer pays
// ticketPrice + (ticketPrice * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT.
const SERVICE_FEE_PERCENT = 0.08; // 8%
const SERVICE_FEE_FLAT = 100; // ₦100

// Flat fee charged when an organizer withdraws from their wallet to their
// bank account. Unrelated to the funding-time fee above - deducted from
// the payout amount, not added on top (there's no buyer to pass it to).
const WITHDRAWAL_FEE_FLAT = 50; // ₦50

module.exports = {
  ERROR_MESSAGES,
  WEBHOOK_RESPONSE,
  PAYMENT_PROVIDERS,
  DEFAULT_QUANTITY,
  SERVICE_FEE_PERCENT,
  SERVICE_FEE_FLAT,
  WITHDRAWAL_FEE_FLAT
};

