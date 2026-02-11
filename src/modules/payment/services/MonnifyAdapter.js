/**
 * Monnify Adapter
 * Infrastructure layer - Monnify payment gateway integration
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../../utils/logger');

class MonnifyAdapter {
  constructor({ paymentService, transactionRepository }) {
    this.paymentService = paymentService;
    this.transactionRepository = transactionRepository;
  }

  /**
   * Login to Monnify API
   * @returns {Promise<string|null>} Access token
   */
  async login() {
    try {
      const apiKey = process.env.MONNIFY_API_KEY;
      const secretKey = process.env.MONNIFY_SECRET_KEY;
      const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

      const res = await axios.post(`${process.env.MONNIFY_API_BASE}/api/v1/auth/login`, {}, {
        headers: { Authorization: `Basic ${credentials}` }
      });

      const data = res.data;
      return data && data.requestSuccessful === true ? data.responseBody?.accessToken : null;
    } catch (error) {
      logger.error('Monnify login failed', { error: error.message });
      return null;
    }
  }

  /**
   * Verify Monnify transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object|null>} Transaction data
   */
  async verify(transactionId) {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Failed to authenticate with Monnify');
      }

      const res = await axios.get(`${process.env.MONNIFY_API_BASE}/transactions/${encodeURIComponent(transactionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data;
      return data && data.responseMessage === 'success' ? data.responseBody : null;
    } catch (error) {
      logger.error('Monnify verification failed', { transactionId, error: error.message });
      throw error;
    }
  }

  /**
   * Poll pending Monnify transactions
   * @returns {Promise<Object>} Polling stats
   */
  async pollPendingTransactions() {
    const stats = { found: 0, processed: 0, failed: 0, processedIds: [], failedIds: [] };
    try {
      const result = await this.transactionRepository.find({
        provider: 'monnify',
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
      }, {
        limit: 50
      });

      stats.found = result.transactions.length;
      if (stats.found === 0) return stats;

      for (const transaction of result.transactions) {
        try {
          if (!transaction.transReference) {
            continue;
          }

          const verified = await this.verify(transaction.transReference);
          if (verified && verified.paymentStatus === 'PAID') {
            const metadata = verified.metadata || {
              userId: transaction.userId,
              eventId: transaction.eventId,
              quantity: transaction.quantity
            };

            await this.paymentService.handleSuccessfulPayment({
              provider: 'monnify',
              reference: transaction.reference,
              amount: verified.amountPaid || verified.amount,
              currency: verified.currencyCode || 'NGN',
              metadata,
              raw: verified
            });
            stats.processed++;
            stats.processedIds.push(transaction.reference);
          } else if (verified && verified.paymentStatus === 'FAILED') {
            await this.transactionRepository.update(transaction.id, { status: 'failed' });
            stats.failed++;
            stats.failedIds.push(transaction.reference);
          }
        } catch (error) {
          logger.error(`Error polling Monnify transaction ${transaction.reference}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error in Monnify polling job:', error);
    }
    return stats;
  }
}

module.exports = MonnifyAdapter;


