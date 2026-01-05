/**
 * Poll Pending Transactions Use Case
 * Application layer - business logic
 * Background job to verify pending transactions with payment providers
 */

const logger = require('../../../utils/logger');

class PollPendingTransactionsUseCase {
  constructor({
    transactionRepository,
    paystackAdapter,
    flutterwaveAdapter,
    payazaAdapter,
    monnifyAdapter,
    paymentService
  }) {
    this.transactionRepository = transactionRepository;
    this.paystackAdapter = paystackAdapter;
    this.flutterwaveAdapter = flutterwaveAdapter;
    this.payazaAdapter = payazaAdapter;
    this.monnifyAdapter = monnifyAdapter;
    this.paymentService = paymentService;
  }

  /**
   * Poll Flutterwave pending transactions
   */
  async pollFlutterwave() {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = await this.transactionRepository.find({
        provider: 'flutterwave',
        status: 'pending',
        createdAt: { $gte: twoHoursAgo } // Last 2 hours
      }, {
        limit: 50
      });

      logger.info(`Polling ${result.transactions.length} pending Flutterwave transactions`, {
        queryTime: twoHoursAgo.toISOString(),
        foundCount: result.transactions.length
      });

      for (const transaction of result.transactions) {
        try {
          if (!transaction.transId) {
            logger.warn(`Skipping Flutterwave transaction without transId: ${transaction.reference}`);
            continue; // Skip if no transaction ID
          }

          logger.debug(`Verifying Flutterwave transaction`, {
            reference: transaction.reference,
            transId: transaction.transId,
            createdAt: transaction.createdAt
          });

          const verified = await this.flutterwaveAdapter.verify(transaction.transId);

          if (!verified) {
            logger.debug(`Flutterwave transaction verification returned null for transId: ${transaction.transId}`);
            continue;
          }

          logger.debug(`Flutterwave transaction verification result`, {
            reference: transaction.reference,
            transId: transaction.transId,
            status: verified.status,
            amount: verified.amount
          });

          if (verified.status === 'successful') {
            logger.info(`Processing pending Flutterwave transaction: ${transaction.reference}`);
            const metadata = verified.meta || (verified.customer && verified.customer.meta) || {
              userId: transaction.userId,
              eventId: transaction.eventId,
              quantity: transaction.quantity
            };

            await this.paymentService.handleSuccessfulPayment({
              provider: 'flutterwave',
              reference: transaction.reference,
              amount: verified.amount,
              currency: verified.currency || 'NGN',
              metadata,
              raw: verified
            });
          } else if (verified.status === 'failed') {
            await this.transactionRepository.update(transaction.id, { status: 'failed' });
            logger.info(`Transaction failed: ${transaction.reference}`);
          } else {
            logger.debug(`Flutterwave transaction still pending or in other state`, {
              reference: transaction.reference,
              status: verified.status
            });
          }
        } catch (error) {
          logger.error(`Error polling Flutterwave transaction ${transaction.reference}:`, {
            error: error.message,
            stack: error.stack,
            transId: transaction.transId
          });
        }
      }
    } catch (error) {
      logger.error('Error in Flutterwave polling job:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Poll Payaza pending transactions
   */
  async pollPayaza() {
    try {
      await this.payazaAdapter.pollPendingTransactions();
    } catch (error) {
      logger.error('Error in Payaza polling job:', error);
    }
  }

  /**
   * Poll Monnify pending transactions
   */
  async pollMonnify() {
    try {
      await this.monnifyAdapter.pollPendingTransactions();
    } catch (error) {
      logger.error('Error in Monnify polling job:', error);
    }
  }

  /**
   * Poll Paystack pending transactions
   */
  async pollPaystack() {
    try {
      const result = await this.transactionRepository.find({
        provider: 'paystack',
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
      }, {
        limit: 50
      });

      logger.info(`Polling ${result.transactions.length} pending Paystack transactions`);

      for (const transaction of result.transactions) {
        try {
          if (!transaction.reference) {
            continue;
          }

          const verified = await this.paystackAdapter.verify(transaction.reference);
          if (verified && verified.status === 'success') {
            logger.info(`Processing pending Paystack transaction: ${transaction.reference}`);
            const metadata = verified.metadata || {
              userId: transaction.userId,
              eventId: transaction.eventId,
              quantity: transaction.quantity
            };

            await this.paymentService.handleSuccessfulPayment({
              provider: 'paystack',
              reference: transaction.reference,
              amount: verified.amount / 100, // Convert from kobo
              currency: verified.currency || 'NGN',
              metadata,
              raw: verified
            });
          } else if (verified && verified.status === 'failed') {
            await this.transactionRepository.update(transaction.id, { status: 'failed' });
            logger.info(`Transaction failed: ${transaction.reference}`);
          }
        } catch (error) {
          logger.error(`Error polling Paystack transaction ${transaction.reference}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error in Paystack polling job:', error);
    }
  }

  /**
   * Poll all pending transactions
   */
  async execute() {
    try {
      logger.info('Starting payment polling job');

      // Poll all providers in parallel
      await Promise.all([
        this.pollFlutterwave(),
        this.pollPayaza(),
        this.pollMonnify(),
        this.pollPaystack()
      ]);

      logger.info('Payment polling job completed successfully');
    } catch (error) {
      logger.error('Error in payment polling job:', error);
    }
  }
}

module.exports = PollPendingTransactionsUseCase;

