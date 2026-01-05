/**
 * WalletEmailAdapter
 * Uses Resend + shared email templates to send wallet notifications.
 */

const { Resend } = require('resend');
const templates = require('../../../emails/templates');

class WalletEmailAdapter {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@jaaiye.com';
  }

  async sendEventWalletCreditedEmail(user, payload) {
    const email = typeof user === 'object' ? user.email : user;
    if (!email) {
      throw new Error('Email is required for event wallet notification');
    }

    const html = templates.walletEventCreditedEmail(payload);
    const subject = `💰 Your event wallet has been credited`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject,
      html
    });
  }

  async sendWithdrawalSuccessEmail(user, payload) {
    const email = typeof user === 'object' ? user.email : user;
    if (!email) {
      throw new Error('Email is required for withdrawal notification');
    }

    const html = templates.walletWithdrawalSuccessEmail(payload);
    const subject = `✅ Your withdrawal was successful`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject,
      html
    });
  }

  async sendWithdrawalFailedEmail(user, payload) {
    const email = typeof user === 'object' ? user.email : user;
    if (!email) {
      throw new Error('Email is required for withdrawal notification');
    }

    const html = templates.walletWithdrawalFailedEmail(payload);
    const subject = `❌ Your withdrawal could not be completed`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject,
      html
    });
  }

  async sendGroupWalletCreditedEmail(user, payload) {
    const email = typeof user === 'object' ? user.email : user;
    if (!email) {
      throw new Error('Email is required for group wallet notification');
    }

    const html = templates.walletGroupCreditedEmail(payload);
    const subject = `💰 Your group wallet has been funded`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject,
      html
    });
  }

  async sendWalletAdjustedRefundEmail(user, payload) {
    const email = typeof user === 'object' ? user.email : user;
    if (!email) {
      throw new Error('Email is required for refund notification');
    }

    const html = templates.walletAdjustedRefundEmail(payload);
    const subject = `⚠️ Your wallet was adjusted due to a refund`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject,
      html
    });
  }

  async sendWalletAdjustedManualEmail(user, payload) {
    const email = typeof user === 'object' ? user.email : user;
    if (!email) {
      throw new Error('Email is required for manual adjustment notification');
    }

    const html = templates.walletAdjustedManualEmail(payload);
    const subject = `📝 Your wallet balance was updated`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject,
      html
    });
  }
}

module.exports = WalletEmailAdapter;


