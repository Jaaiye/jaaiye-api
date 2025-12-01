/**
 * Payaza Adapter
 * Infrastructure layer - Payaza payment gateway integration
 */

const axios = require('axios');
const logger = require('../../../../utils/logger');

const API_BASE = 'https://api.payaza.africa/live/merchant-collection/transfer_notification_controller/transaction-query';

class PayazaAdapter {
  constructor({ paymentService, transactionRepository }) {
    this.paymentService = paymentService;
    this.transactionRepository = transactionRepository;
  }

  /**
   * Verify Payaza transaction
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object|null>} Transaction data
   */
  async verify(reference) {
    try {
      const res = await axios.get(`${API_BASE}?transaction_reference=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${process.env.PAYAZA_SECRET_KEY}` }
      });
      const data = res.data;
      return data && data.status ? data.data : null;
    } catch (error) {
      logger.error('Payaza verification failed', { reference, error: error.message });
      throw error;
    }
  }

  /**
   * Poll pending Payaza transactions
   * @returns {Promise<void>}
   */
  async pollPendingTransactions() {
    try {
      const result = await this.transactionRepository.find({
        provider: 'payaza',
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
      }, {
        limit: 50
      });

      logger.info(`Polling ${result.transactions.length} pending Payaza transactions`);

      for (const transaction of result.transactions) {
        try {
          const verified = await this.verify(transaction.reference);
          if (verified && verified.status === 'successful') {
            logger.info(`Processing pending Payaza transaction: ${transaction.reference}`);
            const metadata = verified.meta || (verified.customer && verified.customer.meta) || {
              userId: transaction.userId,
              eventId: transaction.eventId,
              quantity: transaction.quantity
            };

            await this.paymentService.handleSuccessfulPayment({
              provider: 'payaza',
              reference: transaction.reference,
              amount: verified.amount,
              currency: verified.currency || 'NGN',
              metadata,
              raw: verified
            });
          } else if (verified && verified.status === 'failed') {
            await this.transactionRepository.update(transaction.id, { status: 'failed' });
            logger.info(`Transaction failed: ${transaction.reference}`);
          }
        } catch (error) {
          logger.error(`Error polling Payaza transaction ${transaction.reference}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error in Payaza polling job:', error);
    }
  }
}

module.exports = PayazaAdapter;


