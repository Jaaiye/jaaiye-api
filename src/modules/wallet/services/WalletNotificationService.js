/**
 * WalletNotificationService
 * Domain-level helper to send wallet-related email notifications.
 *
 * This service is thin and delegates actual email sending to an injected adapter.
 */

class WalletNotificationService {
  constructor({ emailAdapter }) {
    this.emailAdapter = emailAdapter;
  }

  /**
   * Notify event owner that their event wallet was credited from ticket sales.
   *
   * @param {Object} params
   * @param {Object} params.user - recipient user { email, fullName, username }
   * @param {string} params.eventTitle
   * @param {number} params.grossAmount
   * @param {number} params.feeAmount
   * @param {number} params.netAmount
   * @param {number} params.walletBalanceAfter
   */
  async sendEventWalletCreditedEmail({ user, eventTitle, grossAmount, feeAmount, netAmount, walletBalanceAfter }) {
    if (!this.emailAdapter || !this.emailAdapter.sendEventWalletCreditedEmail) {
      return;
    }
    await this.emailAdapter.sendEventWalletCreditedEmail(user, {
      eventTitle,
      grossAmount,
      feeAmount,
      netAmount,
      walletBalanceAfter
    });
  }

  async sendWithdrawalSuccessEmail({ user, ownerLabel, payoutAmountNet, feeAmount, walletBalanceAfter, destinationMasked }) {
    if (!this.emailAdapter || !this.emailAdapter.sendWithdrawalSuccessEmail) {
      return;
    }
    await this.emailAdapter.sendWithdrawalSuccessEmail(user, {
      ownerLabel,
      payoutAmountNet,
      feeAmount,
      walletBalanceAfter,
      destinationMasked
    });
  }

  async sendWithdrawalFailedEmail({ user, ownerLabel, payoutAmountNet, failureReason }) {
    if (!this.emailAdapter || !this.emailAdapter.sendWithdrawalFailedEmail) {
      return;
    }
    await this.emailAdapter.sendWithdrawalFailedEmail(user, {
      ownerLabel,
      payoutAmountNet,
      failureReason
    });
  }

  async sendGroupWalletCreditedEmail({ user, groupName, hangoutTitle, amount, feeAmount, netAmount, walletBalanceAfter }) {
    if (!this.emailAdapter || !this.emailAdapter.sendGroupWalletCreditedEmail) {
      return;
    }
    await this.emailAdapter.sendGroupWalletCreditedEmail(user, {
      groupName,
      hangoutTitle,
      amount,
      feeAmount,
      netAmount,
      walletBalanceAfter
    });
  }

  async sendWalletAdjustedRefundEmail({ user, ownerLabel, amount, reason, walletBalanceAfter }) {
    if (!this.emailAdapter || !this.emailAdapter.sendWalletAdjustedRefundEmail) {
      return;
    }
    await this.emailAdapter.sendWalletAdjustedRefundEmail(user, {
      ownerLabel,
      amount,
      reason,
      walletBalanceAfter
    });
  }

  async sendWalletAdjustedManualEmail({ user, ownerLabel, amount, reason, walletBalanceAfter }) {
    if (!this.emailAdapter || !this.emailAdapter.sendWalletAdjustedManualEmail) {
      return;
    }
    await this.emailAdapter.sendWalletAdjustedManualEmail(user, {
      ownerLabel,
      amount,
      reason,
      walletBalanceAfter
    });
  }
}

module.exports = WalletNotificationService;


