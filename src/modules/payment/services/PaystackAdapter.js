/**
 * Paystack Payment Adapter
 * Infrastructure layer - external service adapter
 */

const crypto = require('crypto');
const axios = require('axios');
const { timingSafeEqualStr } = require('../../../utils/securityUtils');
const logger = require('../../../utils/logger');

const API_BASE = 'https://api.paystack.co';

class PaystackAdapter {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
  }

  /**
   * Initialize payment
   * @param {Object} data - { amount, email, metadata }
   * @returns {Promise<{ authorizationUrl: string, reference: string }>}
   */
  async initializePayment({ amount, email, metadata }) {
    const payload = {
      amount: Math.round(amount * 100), // Convert to kobo
      email,
      metadata,
      callback_url: this.callbackUrl
    };

    const res = await axios.post(`${API_BASE}/transaction/initialize`, payload, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = res.data;
    if (!data.status) {
      throw new Error(data.message || 'Paystack init failed');
    }

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference
    };
  }

  /**
   * Verify transaction
   * @param {string} reference
   * @returns {Promise<Object|null>}
   */
  async verify(reference) {
    const res = await axios.get(`${API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` }
    });
    const data = res.data;
    return data && data.status ? data.data : null;
  }

  /**
   * Validate webhook signature
   * @param {Object} headers
   * @param {Object} body - parsed body, used as a fallback only
   * @param {Buffer} [rawBody] - exact bytes Paystack signed; preferred over `body`
   * @returns {boolean}
   */
  isValidSignature(headers, body, rawBody) {
    const signature = headers['x-paystack-signature'];

    if (!this.secretKey) {
      if (process.env.NODE_ENV === 'production') {
        // Never accept unsigned/unverifiable webhooks in production - a
        // missing secret must fail closed, not silently disable the check.
        logger.error('PAYSTACK_SECRET_KEY is not configured - rejecting webhook');
        return false;
      }
      logger.warn('PAYSTACK_SECRET_KEY not set - allowing unverified webhook (non-production only)');
      return true;
    }

    if (!signature) {
      return false;
    }

    const payload = Buffer.isBuffer(rawBody) ? rawBody : JSON.stringify(body);
    const hash = crypto.createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');
    return timingSafeEqualStr(hash, signature);
  }

  /**
   * Process webhook
   * @param {Object} headers
   * @param {Object} body
   * @param {Buffer} [rawBody]
   * @returns {Promise<Object>}
   */
  async processWebhook(headers, body, rawBody) {
    if (!this.isValidSignature(headers, body, rawBody)) {
      return { ok: false, reason: 'invalid_signature' };
    }

    if (body && body.event === 'charge.success') {
      const reference = body.data && body.data.reference;
      const verified = await this.verify(reference);
      if (verified && verified.status === 'success') {
        const metadata = verified.metadata || {};
        return {
          ok: true,
          provider: 'paystack',
          reference,
          amount: verified.amount / 100, // Convert from kobo
          currency: verified.currency || 'NGN',
          metadata,
          raw: verified
        };
      }
    }
    return { ok: false };
  }
}

module.exports = PaystackAdapter;

