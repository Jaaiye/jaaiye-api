/**
 * Payment Controller
 * Presentation layer - HTTP request handler
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const {
  InitializePaymentDTO,
  RegisterTransactionDTO,
  UpdateTransactionDTO
} = require('./dto');
const {
  InitializePaystackPaymentUseCase,
  InitializeFlutterwavePaymentUseCase,
  VerifyPaystackPaymentUseCase,
  VerifyFlutterwavePaymentUseCase,
  RegisterTransactionUseCase,
  UpdateTransactionUseCase,
  ProcessPaystackWebhookUseCase,
  ProcessFlutterwaveWebhookUseCase,
  GetMyTransactionsUseCase,
  ListTransactionsUseCase
} = require('./use-cases');

class PaymentController {
  constructor({
    initializePaystackPaymentUseCase,
    initializeFlutterwavePaymentUseCase,
    verifyPaystackPaymentUseCase,
    verifyFlutterwavePaymentUseCase,
    registerTransactionUseCase,
    updateTransactionUseCase,
    processPaystackWebhookUseCase,
    processFlutterwaveWebhookUseCase,
    paystackAdapter,
    flutterwaveAdapter,
    getMyTransactionsUseCase,
    listTransactionsUseCase
  }) {
    /**
     * @swagger
     * /payments/paystack/init:
     *   post:
     *     summary: Initialize Paystack payment
     *     tags: [Payments]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Payment initialized
     */
    this.initializePaystack = asyncHandler(async (req, res) => {
      const userId = req.user && req.user._id ? req.user._id : req.body.userId;
      const dto = new InitializePaymentDTO({
        ...req.body,
        userId
      });
      const result = await initializePaystackPaymentUseCase.execute(dto);
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /payments/flutterwave/init:
     *   post:
     *     summary: Initialize Flutterwave payment
     *     tags: [Payments]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Payment initialized
     */
    this.initializeFlutterwave = asyncHandler(async (req, res) => {
      const userId = req.user && req.user._id ? req.user._id : req.body.userId;
      const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['X-Idempotency-Key'];
      const dto = new InitializePaymentDTO({
        ...req.body,
        userId
      });
      const result = await initializeFlutterwavePaymentUseCase.execute(dto, idempotencyKey);
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /payments/paystack/verify:
     *   post:
     *     summary: Verify Paystack payment
     *     tags: [Payments]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [reference]
     *             properties:
     *               reference:
     *                 type: string
     *     responses:
     *       200:
     *         description: Verification complete
     */
    this.verifyPaystack = asyncHandler(async (req, res) => {
      const { reference } = req.body;
      const result = await verifyPaystackPaymentUseCase.execute(reference);
      return res.status(200).json({ result });
    });

    /**
     * @swagger
     * /payments/flutterwave/verify:
     *   post:
     *     summary: Verify Flutterwave payment
     *     tags: [Payments]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [reference]
     *             properties:
     *               reference:
     *                 type: string
     *     responses:
     *       200:
     *         description: Verification complete
     */
    this.verifyFlutterwave = asyncHandler(async (req, res) => {
      const { reference } = req.body;
      const result = await verifyFlutterwavePaymentUseCase.execute(reference);
      return res.status(200).json({ result });
    });

    this.handlePaystackWebhook = asyncHandler(async (req, res) => {
      // Verify the signature *before* acknowledging the request. An invalid
      // signature must never get a 200 - that would train an attacker (or
      // a misbehaving retry) that unsigned requests are accepted.
      if (!paystackAdapter.isValidSignature(req.headers, req.body, req.rawBody)) {
        logger.warn('Rejected Paystack webhook with invalid signature');
        return res.status(401).json({ received: false, error: 'invalid_signature' });
      }

      res.status(200).json({ received: true });

      // The rest (verifying with Paystack's API, creating tickets, sending
      // email) can take a while - do it after responding so Paystack's
      // retry timeout isn't a factor.
      (async () => {
        try {
          const result = await processPaystackWebhookUseCase.execute(req.headers, req.body, req.rawBody);
          if (result && result.ok) {
            logger.info('Paystack webhook processed successfully');
          } else {
            logger.warn('Paystack webhook processed with issues', { result });
          }
        } catch (error) {
          logger.error('Error processing Paystack webhook', { error: error.message });
        }
      })();
    });

    this.handleFlutterwaveWebhook = asyncHandler(async (req, res) => {
      // Verify the signature *before* acknowledging the request - see note
      // in handlePaystackWebhook above.
      if (!flutterwaveAdapter.isValidSignature(req.headers, req.body, req.rawBody)) {
        logger.warn('Rejected Flutterwave webhook with invalid signature');
        return res.status(401).json({ received: false, error: 'invalid_signature' });
      }

      res.status(200).json({ received: true });

      // Process webhook asynchronously
      (async () => {
        try {
          const result = await processFlutterwaveWebhookUseCase.execute(req.headers, req.body, req.rawBody);
          if (result && result.ok) {
            logger.info('Flutterwave webhook processed successfully');
          } else {
            logger.warn('Flutterwave webhook processed with issues', { result });
          }
        } catch (error) {
          logger.error('Error processing Flutterwave webhook', { error: error.message });
        }
      })();
    });

    /**
     * @swagger
     * /payments/register:
     *   post:
     *     summary: Register transaction
     *     tags: [Payments]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [reference, amount, provider]
     *             properties:
     *               reference:
     *                 type: string
     *               amount:
     *                 type: number
     *               provider:
     *                 type: string
     *                 enum: [paystack, flutterwave]
     *     responses:
     *       201:
     *         description: Transaction registered
     */
    this.registerTransaction = asyncHandler(async (req, res) => {
      const userId = req.user && req.user._id ? req.user._id : req.body.userId;
      if (!userId) {
        throw new Error('User ID is required');
      }

      const dto = new RegisterTransactionDTO({
        ...req.body,
        userId
      });
      const result = await registerTransactionUseCase.execute(dto);
      return res.status(201).json({
        success: true,
        data: result
      });
    });

    /**
     * @swagger
     * /payments/update:
     *   put:
     *     summary: Update transaction
     *     tags: [Payments]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Transaction updated
     */
    this.updateTransaction = asyncHandler(async (req, res) => {
      const dto = new UpdateTransactionDTO(req.body);
      const result = await updateTransactionUseCase.execute(dto);
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /transactions/my:
     *   get:
     *     summary: Get my transactions
     *     tags: [Payments]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of transactions
     */
    this.getMyTransactions = asyncHandler(async (req, res) => {
      const userId = req.user._id || req.user.id;
      const result = await getMyTransactionsUseCase.execute(userId);
      return successResponse(res, result);
    });

    this.listTransactions = asyncHandler(async (req, res) => {
      const { status, provider } = req.query;
      const result = await listTransactionsUseCase.execute({ status, provider });
      return successResponse(res, result);
    });
  }
}

module.exports = PaymentController;

