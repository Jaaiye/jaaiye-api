/**
 * Payment Controller
 * Presentation layer - HTTP request handler
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');
const logger = require('../../../../utils/logger');
const {
  InitializePaymentDTO,
  RegisterTransactionDTO,
  UpdateTransactionDTO
} = require('../../application/dto');
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
} = require('../../application/use-cases');

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
    getMyTransactionsUseCase,
    listTransactionsUseCase
  }) {
    this.initializePaystack = asyncHandler(async (req, res) => {
      const userId = req.user && req.user._id ? req.user._id : req.body.userId;
      const dto = new InitializePaymentDTO({
        ...req.body,
        userId
      });
      const result = await initializePaystackPaymentUseCase.execute(dto);
      return successResponse(res, result);
    });

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

    this.verifyPaystack = asyncHandler(async (req, res) => {
      const { reference } = req.body;
      const result = await verifyPaystackPaymentUseCase.execute(reference);
      return res.status(200).json({ result });
    });

    this.verifyFlutterwave = asyncHandler(async (req, res) => {
      const { reference } = req.body;
      const result = await verifyFlutterwavePaymentUseCase.execute(reference);
      return res.status(200).json({ result });
    });

    this.handlePaystackWebhook = asyncHandler(async (req, res) => {
      res.status(200).json({ received: true });

      // Process webhook asynchronously
      (async () => {
        try {
          const result = await processPaystackWebhookUseCase.execute(req.headers, req.body);
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
      res.status(200).json({ received: true });

      // Process webhook asynchronously
      (async () => {
        try {
          const result = await processFlutterwaveWebhookUseCase.execute(req.headers, req.body);
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

    this.updateTransaction = asyncHandler(async (req, res) => {
      const dto = new UpdateTransactionDTO(req.body);
      const result = await updateTransactionUseCase.execute(dto);
      return successResponse(res, result);
    });

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

