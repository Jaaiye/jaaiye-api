/**
 * Payment Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../../../middleware/authMiddleware');
const { idempotencyMiddleware } = require('../../../../middleware/idempotencyMiddleware');
const { validate } = require('../../../../middleware/validationMiddleware');
const {
  initializePaymentValidator,
  verifyPaymentValidator,
  registerTransactionValidator,
  updateTransactionValidator
} = require('../validators/paymentValidators');

class PaymentRoutes {
  constructor({ paymentController }) {
    this.paymentController = paymentController;
  }

  getRoutes() {
    // Initialize Paystack payment
    router.post('/paystack/init', protect, ...initializePaymentValidator, validate, this.paymentController.initializePaystack);

    // Initialize Flutterwave payment
    router.post('/flutterwave/init', protect, idempotencyMiddleware, ...initializePaymentValidator, validate, this.paymentController.initializeFlutterwave);

    // Verify payments (separate endpoints for each provider)
    router.post('/paystack/verify', ...verifyPaymentValidator, validate, this.paymentController.verifyPaystack);
    router.post('/flutterwave/verify', ...verifyPaymentValidator, validate, this.paymentController.verifyFlutterwave);

    // Register transaction for polling backup (mobile SDK usage)
    router.post('/register', protect, ...registerTransactionValidator, validate, this.paymentController.registerTransaction);

    // Update transaction with payment gateway details
    router.put('/update', protect, ...updateTransactionValidator, validate, this.paymentController.updateTransaction);

    return router;
  }
}

/**
 * Transaction Routes (read-only)
 * These are part of Payment domain but use separate route path
 */
class TransactionRoutes {
  constructor({ paymentController }) {
    this.paymentController = paymentController;
  }

  getRoutes() {
    const express = require('express');
    const router = express.Router();
    const { protect, admin } = require('../../../../middleware/authMiddleware');

    // Get current user's transactions
    router.get('/my', protect, this.paymentController.getMyTransactions);

    // Admin list transactions
    router.get('/', protect, admin, this.paymentController.listTransactions);

    return router;
  }
}

module.exports = { PaymentRoutes, TransactionRoutes };

