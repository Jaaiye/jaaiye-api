/**
 * Flutterwave Payment Adapter
 * Infrastructure layer - external service adapter
 */

const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// const API_BASE = 'https://developersandbox-api.flutterwave.com';
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
  async initializePayment({ amount, reference, email, metadata, currency = 'NGN', idempotencyKey }) {
    // Generate idempotency key if not provided
    const key = idempotencyKey || uuidv4();

    const payload = {
      tx_ref: reference,
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
          reference: payload.tx_ref,
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
            reference: payload.tx_ref,
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
    if (!this.isValidSignature(headers, body)) {
      console.error('Invalid Flutterwave webhook signature');
      return { ok: false, reason: 'invalid_signature' };
    }

    const event = body?.event;
    const data = body?.data;

    if (!event || !data) {
      console.error('Missing event or data in webhook payload');
      return { ok: false, reason: 'invalid_payload' };
    }

    switch (event) {
      case 'charge.completed':
        return await this.handleChargeCompleted(data);

      case 'transfer.completed':
        return await this.handleTransferCompleted(data);

      case 'transfer.failed':
        return await this.handleTransferFailed(data);

      case 'charge.refunded':
      case 'refund.completed':
        return await this.handleRefundCompleted(data);

      default:
        console.log('Flutterwave webhook event not handled:', event);
        return { ok: false, reason: 'event_not_handled', event };
    }
  }

  async handleChargeCompleted(data) {
    if (data.status !== 'successful') {
      console.warn('Charge completed but status not successful:', data.status);
      return { ok: false, reason: 'charge_not_successful', status: data.status };
    }

    const transId = data.id || data.tx_ref;
    if (!transId) {
      console.error('No transaction ID found in charge data');
      return { ok: false, reason: 'no_transaction_id' };
    }

    try {
      const verified = await this.verify(transId);

      if (verified?.status !== 'successful') {
        console.warn('Charge verification failed for ID:', transId);
        return { ok: false, reason: 'verification_failed' };
      }

      const metadata = verified.meta || verified.customer?.meta || {};

      return {
        ok: true,
        provider: 'flutterwave',
        type: 'charge',
        reference: verified.tx_ref || transId,
        amount: verified.amount,
        currency: verified.currency || 'NGN',
        metadata,
        raw: verified
      };
    } catch (error) {
      console.error('Error processing charge webhook:', error);
      return { ok: false, reason: 'processing_error', error: error.message };
    }
  }

  async handleTransferCompleted(data) {
    // Flutterwave transfer statuses: SUCCESSFUL, FAILED, PENDING, NEW
    if (data.status !== 'SUCCESSFUL') {
      console.warn('Transfer completed but status not SUCCESSFUL:', data.status);
      return { ok: false, reason: 'transfer_not_successful', status: data.status };
    }

    const transferId = data.id;
    const reference = data.reference || data.tx_ref;

    if (!transferId && !reference) {
      console.error('No transfer ID or reference found in transfer data');
      return { ok: false, reason: 'no_transfer_id' };
    }

    try {
      // Optionally verify transfer via API (GET /transfers/{id})
      // This ensures we have the latest status
      let verified = null;
      if (transferId) {
        try {
          verified = await this.verifyTransfer(transferId);
        } catch (verifyError) {
          console.warn('Failed to verify transfer, using webhook data', { transferId, error: verifyError.message });
        }
      }

      const transferData = verified || data;

      return {
        ok: true,
        provider: 'flutterwave',
        type: 'transfer',
        reference: transferData.reference || reference,
        transferId: transferData.id || transferId,
        amount: transferData.amount,
        currency: transferData.currency || 'NGN',
        metadata: transferData.meta || {},
        raw: transferData
      };
    } catch (error) {
      console.error('Error processing transfer webhook:', error);
      return { ok: false, reason: 'processing_error', error: error.message };
    }
  }

  async handleTransferFailed(data) {
    const transferId = data.id;
    const reference = data.reference || data.tx_ref;

    console.error('Transfer failed:', {
      id: transferId,
      reference,
      status: data.status,
      reason: data.complete_message || data.narration || data.reason
    });

    return {
      ok: false,
      provider: 'flutterwave',
      type: 'transfer',
      reason: 'transfer_failed',
      reference: reference || transferId,
      transferId,
      status: data.status,
      failureReason: data.complete_message || data.narration || data.reason || 'Transfer failed',
      raw: data
    };
  }

  async handleRefundCompleted(data) {
    const transId = data.id || data.tx_ref || data.reference;
    const refundAmount = data.amount || data.refund_amount;
    const originalTxRef = data.tx_ref || data.flw_ref || data.reference;

    console.log('Refund completed:', {
      id: transId,
      originalTxRef,
      refundAmount,
      status: data.status
    });

    return {
      ok: true,
      provider: 'flutterwave',
      type: 'refund',
      reference: originalTxRef, // Original transaction reference
      refundReference: transId,
      amount: refundAmount,
      currency: data.currency || 'NGN',
      raw: data
    };
  }

  /**
   * Get list of banks
   * @param {string} [country='NG'] - Country code (default: NG for Nigeria)
   * @returns {Promise<Array<{ code: string, name: string }>>}
   */
  async getBanks(country = 'NG') {
    try {
      const res = await axios.get(`${API_BASE}/banks/${country}`, {
        headers: { Authorization: `Bearer ${this.secretKey}` }
      });

      const data = res.data;
      if (data && data.status === 'success' && data.data) {
        // Flutterwave returns banks as array
        return data.data.map(bank => ({
          code: bank.code,
          name: bank.name
        }));
      }

      throw new Error(data?.message || 'Failed to fetch banks from Flutterwave');
    } catch (error) {
      console.error('Error fetching Flutterwave banks:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Resolve bank account details (for withdrawals)
   * @param {Object} params
   * @param {string} params.accountNumber
   * @param {string} params.bankCode
   * @returns {Promise<{ accountNumber: string, bankCode: string, accountName: string }>}
   */
  async resolveBankAccount({ accountNumber, bankCode }) {
    try {
      const res = await axios.post(`${API_BASE}/accounts/resolve`, {
        account_number: accountNumber,
        account_bank: bankCode
      }, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = res.data;
      if (data && data.status === 'success' && data.data) {
        return {
          accountNumber: data.data.account_number,
          bankCode,
          accountName: data.data.account_name
        };
      }

      throw new Error(data?.message || 'Failed to resolve bank account with Flutterwave');
    } catch (error) {
      console.error('Error resolving Flutterwave bank account:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify a transfer by ID
   * @param {string|number} transferId
   * @returns {Promise<Object|null>}
   */
  async verifyTransfer(transferId) {
    try {
      const res = await axios.get(`${API_BASE}/transfers/${transferId}`, {
        headers: { Authorization: `Bearer ${this.secretKey}` }
      });

      const data = res.data;
      return data && data.status === 'success' ? data.data : null;
    } catch (error) {
      console.error('Error verifying Flutterwave transfer:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Create a transfer (payout) to a bank account
   * Reference: https://developer.flutterwave.com/reference/create-a-transfer
   *
   * @param {Object} params
   * @param {number} params.amount
   * @param {string} params.bankCode - Bank code (e.g., '044' for Access Bank)
   * @param {string} params.accountNumber
   * @param {string} params.accountName
   * @param {string} params.reference - Unique reference for the transfer
   * @param {string} [params.narration] - Transfer narration/description
   * @param {string} [params.currency='NGN'] - Currency code
   * @returns {Promise<{ id: string, reference: string, status: string }>}
   */
  async createTransfer({ amount, bankCode, accountNumber, accountName, reference, narration, currency = 'NGN' }) {
    try {
      const payload = {
        account_bank: bankCode,
        account_number: accountNumber,
        amount: Number(amount),
        narration: narration || 'Jaaiye wallet withdrawal',
        currency,
        reference,
        beneficiary_name: accountName
      };

      const res = await axios.post(`${API_BASE}/transfers`, payload, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = res.data;
      if (data && data.status === 'success' && data.data) {
        return {
          id: data.data.id,
          reference: data.data.reference || reference,
          status: data.data.status,
          fullName: data.data.full_name,
          accountNumber: data.data.account_number,
          bankName: data.data.bank_name,
          createdAt: data.data.created_at
        };
      }

      throw new Error(data?.message || 'Failed to create transfer with Flutterwave');
    } catch (error) {
      console.error('Error creating Flutterwave transfer:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify transfer status
   * @param {string} transferId - Flutterwave transfer ID
   * @returns {Promise<Object>} Transfer data
   */
  async verifyTransfer(transferId) {
    try {
      const res = await axios.get(`${API_BASE}/transfers/${transferId}`, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = res.data;
      if (data && data.status === 'success' && data.data) {
        return {
          id: data.data.id,
          reference: data.data.reference,
          status: data.data.status, // SUCCESSFUL, FAILED, PENDING, NEW
          amount: data.data.amount,
          fee: data.data.fee,
          currency: data.data.currency,
          narration: data.data.narration,
          complete_message: data.data.complete_message,
          bank_name: data.data.bank_name,
          account_number: data.data.account_number,
          full_name: data.data.full_name,
          created_at: data.data.created_at,
          updated_at: data.data.updated_at
        };
      }

      return null;
    } catch (error) {
      console.error('Error verifying Flutterwave transfer:', error.response?.data || error.message);
      // Don't throw - return null to indicate verification failed
      return null;
    }
  }
}

module.exports = FlutterwaveAdapter;

