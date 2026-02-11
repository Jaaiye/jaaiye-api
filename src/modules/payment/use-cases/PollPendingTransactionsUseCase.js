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
    const stats = { found: 0, processed: 0, failed: 0, processedIds: [], failedIds: [] };
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = await this.transactionRepository.find({
        provider: 'flutterwave',
        status: 'pending',
        createdAt: { $gte: twoHoursAgo } // Last 2 hours
      }, {
        limit: 50
      });

      stats.found = result.transactions.length;
      if (stats.found === 0) return stats;

      for (const transaction of result.transactions) {
        try {
          if (!transaction.transId) {
            continue; // Skip if no transaction ID
          }

          const verified = await this.flutterwaveAdapter.verify(transaction.transId);

          if (!verified) {
            continue;
          }

          if (verified.status === 'successful') {
            const metadata = verified.meta || (verified.customer && verified.customer.meta) || {
              ...(transaction.metadata || {}),
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
            stats.processed++;
            stats.processedIds.push(transaction.reference);
          } else if (verified.status === 'failed') {
            await this.transactionRepository.update(transaction.id, { status: 'failed' });
            stats.failed++;
            stats.failedIds.push(transaction.reference);
          }
        } catch (error) {
          logger.error(`Error polling Flutterwave transaction ${transaction.reference}:`, {
            error: error.message,
            transId: transaction.transId
          });
        }
      }
    } catch (error) {
      logger.error('Error in Flutterwave polling job:', error.message);
    }
    return stats;
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
    const stats = { found: 0, processed: 0, failed: 0, processedIds: [], failedIds: [] };
    try {
      const result = await this.transactionRepository.find({
        provider: 'paystack',
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
      }, {
        limit: 50
      });

      stats.found = result.transactions.length;
      if (stats.found === 0) return stats;

      for (const transaction of result.transactions) {
        try {
          if (!transaction.reference) {
            continue;
          }

          const verified = await this.paystackAdapter.verify(transaction.reference);
          if (verified && verified.status === 'success') {
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
            stats.processed++;
            stats.processedIds.push(transaction.reference);
          } else if (verified && verified.status === 'failed') {
            await this.transactionRepository.update(transaction.id, { status: 'failed' });
            stats.failed++;
            stats.failedIds.push(transaction.reference);
          }
        } catch (error) {
          logger.error(`Error polling Paystack transaction ${transaction.reference}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error in Paystack polling job:', error.message);
    }
    return stats;
  }

  /**
   * Poll all pending transactions
   */
  async execute() {
    const summary = {
      flutterwave: { found: 0, processed: 0, failed: 0, processedIds: [], failedIds: [] },
      payaza: { found: 0, processed: 0, failed: 0, processedIds: [], failedIds: [] },
      monnify: { found: 0, processed: 0, failed: 0, processedIds: [], failedIds: [] },
      paystack: { found: 0, processed: 0, failed: 0, processedIds: [], failedIds: [] },
      totalFound: 0,
      totalProcessed: 0,
      totalFailed: 0,
      audit: {
        processed: [],
        failed: []
      }
    };

    try {
      // Poll all providers in parallel
      const [flutterwave, payaza, monnify, paystack] = await Promise.all([
        this.pollFlutterwave(),
        this.pollPayaza(),
        this.pollMonnify(),
        this.pollPaystack()
      ]);

      summary.flutterwave = flutterwave || summary.flutterwave;
      summary.payaza = payaza || summary.payaza;
      summary.monnify = monnify || summary.monnify;
      summary.paystack = paystack || summary.paystack;

      summary.totalFound = summary.flutterwave.found + summary.payaza.found + summary.monnify.found + summary.paystack.found;
      summary.totalProcessed = summary.flutterwave.processed + summary.payaza.processed + summary.monnify.processed + summary.paystack.processed;
      summary.totalFailed = summary.flutterwave.failed + summary.payaza.failed + summary.monnify.failed + summary.paystack.failed;

      summary.audit.processed = [
        ...summary.flutterwave.processedIds,
        ...summary.paystack.processedIds,
        ...summary.payaza.processedIds,
        ...summary.monnify.processedIds
      ];

      summary.audit.failed = [
        ...summary.flutterwave.failedIds,
        ...summary.paystack.failedIds,
        ...summary.payaza.failedIds,
        ...summary.monnify.failedIds
      ];

    } catch (error) {
      logger.error('Error in payment polling job execution:', error.message);
    }

    return summary;
  }
}

module.exports = PollPendingTransactionsUseCase;

