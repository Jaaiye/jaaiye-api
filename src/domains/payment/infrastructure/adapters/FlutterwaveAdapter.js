/**
 * Flutterwave Payment Adapter
 * Infrastructure layer - external service adapter
 */

const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'https://api.flutterwave.com/v3';

class FlutterwaveAdapter {
  constructor() {
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.webhookSecret = process.env.FLW_WEBHOOK_SECRET;
    this.redirectUrl = process.env.FLW_REDIRECT_URL;
  }

  /**
   * Initialize payment
   * @param {Object} data - { amount, email, metadata, currency, idempotencyKey }
   * @returns {Promise<{ authorizationUrl: string, reference: string, idempotencyKey: string, isCachedResponse: boolean }>}
   */
  async initializePayment({ amount, email, metadata, currency = 'NGN', idempotencyKey }) {
    // Generate idempotency key if not provided
    const key = idempotencyKey || uuidv4();

    const payload = {
      tx_ref: 'flw_' + Date.now(),
      amount,
      currency,
      redirect_url: this.redirectUrl,
      meta: metadata,
      customer: { email }
    };

    try {
      const res = await axios.post(`${API_BASE}/payments`, payload, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': key
        }
      });

      const data = res.data;
      if (data.status === 'success') {
        return {
          authorizationUrl: data.data.link,
          reference: data.data.tx_ref,
          idempotencyKey: key,
          isCachedResponse: false
        };
      } else {
        throw new Error(data.message || 'Flutterwave init failed');
      }
    } catch (error) {
      // Check if it's a cached response (409 Conflict)
      if (error.response && error.response.status === 409) {
        const cachedData = error.response.data;
        if (cachedData && cachedData.data) {
          return {
            authorizationUrl: cachedData.data.link,
            reference: cachedData.data.tx_ref,
            idempotencyKey: key,
            isCachedResponse: true
          };
        }
      }
      throw error;
    }
  }

  /**
   * Verify transaction
   * @param {string|number} transactionId
   * @returns {Promise<Object|null>}
   */
  async verify(transactionId) {
    try {
      const res = await axios.get(`${API_BASE}/transactions/${transactionId}/verify`, {
        headers: { Authorization: `Bearer ${this.secretKey}` }
      });

      const data = res.data;
      return data && data.status === 'success' ? data.data : null;
    } catch (error) {
      console.error('Error verifying Flutterwave transaction:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Validate webhook signature
   * @param {Object} headers
   * @param {Object} body
   * @returns {boolean}
   */
  isValidSignature(headers, body) {
    const secretHash = this.webhookSecret;
    const signature = headers['verif-hash'] || headers['flutterwave-signature'];

    if (!secretHash || !signature) {
      console.warn('Flutterwave webhook signature validation skipped - missing secret or signature');
      return true; // Allow in dev if not set
    }

    const hash = crypto.createHmac('sha256', secretHash)
      .update(JSON.stringify(body))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Process webhook
   * @param {Object} headers
   * @param {Object} body
   * @returns {Promise<Object>}
   */
  async processWebhook(headers, body) {
    // Validate signature first
    if (!this.isValidSignature(headers, body)) {
      console.error('Invalid Flutterwave webhook signature');
      return { ok: false, reason: 'invalid_signature' };
    }

    // Check for successful payment event
    if (body && body.event === 'charge.completed' && body.data && body.data.status === 'successful') {
      const data = body.data;
      const transId = data.id || data.tx_ref;

      if (!transId) {
        console.error('No transaction ID found in Flutterwave webhook');
        return { ok: false, reason: 'no_transaction_id' };
      }

      try {
        // Verify the transaction with Flutterwave API
        const verified = await this.verify(transId);
        if (verified && verified.status === 'successful') {
          const metadata = verified.meta || (verified.customer && verified.customer.meta) || {};
          return {
            ok: true,
            provider: 'flutterwave',
            reference: verified.tx_ref || transId,
            amount: verified.amount,
            currency: verified.currency || 'NGN',
            metadata,
            raw: verified
          };
        } else {
          console.warn('Flutterwave transaction verification failed for ID:', transId);
          return { ok: false, reason: 'verification_failed' };
        }
      } catch (error) {
        console.error('Error processing Flutterwave webhook:', error);
        return { ok: false, reason: 'processing_error', error: error.message };
      }
    }

    console.log('Flutterwave webhook event not processed:', body?.event);
    return { ok: false, reason: 'event_not_handled' };
  }
}

module.exports = FlutterwaveAdapter;

