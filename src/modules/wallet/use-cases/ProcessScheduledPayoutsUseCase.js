/**
 * Process Scheduled Payouts Use Case
 * Application layer - the Thursday step of the weekly automated payout cycle.
 *
 * Pays out whatever was locked in by HoldWalletsForPayoutUseCase on Tuesday.
 * Organizers no longer trigger this themselves - it runs automatically.
 * A wallet with no default bank account on file is skipped (and stays
 * held, so it's picked up automatically once a bank account is added)
 * rather than failing the whole run.
 */

const logger = require('../../../utils/logger');
const { WITHDRAWAL_FEE_FLAT } = require('../../../constants/paymentConstants');

class ProcessScheduledPayoutsUseCase {
  constructor({
    walletRepository,
    walletLedgerEntryRepository,
    withdrawalRepository,
    bankAccountRepository,
    flutterwaveAdapter,
    eventRepository,
    groupRepository,
    walletEmailAdapter
  }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
    this.withdrawalRepository = withdrawalRepository;
    this.bankAccountRepository = bankAccountRepository;
    this.flutterwaveAdapter = flutterwaveAdapter;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
    this.walletEmailAdapter = walletEmailAdapter;
  }

  async execute() {
    const summary = {
      paid: 0,
      totalPaid: 0,
      skippedNoBankAccount: 0,
      failed: 0,
      ownerTypes: {}
    };

    for (const ownerType of ['EVENT', 'GROUP']) {
      summary.ownerTypes[ownerType] = { paid: 0, totalPaid: 0, skippedNoBankAccount: 0, failed: 0 };

      const heldWallets = await this.walletRepository.findAllByOwnerTypeWithHeldBalance(ownerType);

      for (const wallet of heldWallets) {
        try {
          await this.payOutWallet(wallet, ownerType, summary);
        } catch (error) {
          summary.failed += 1;
          summary.ownerTypes[ownerType].failed += 1;
          logger.error('Unexpected error processing scheduled payout for wallet', {
            walletId: wallet.id,
            ownerType,
            ownerId: wallet.ownerId,
            error: error.message,
            stack: error.stack
          });
        }
      }
    }

    return summary;
  }

  async payOutWallet(wallet, ownerType, summary) {
    const heldAmount = Number(wallet.heldForPayout);

    // Resolve the recipient (the person whose bank account gets paid) and
    // a human-readable name for the transfer narration/email.
    let recipientUserId;
    let ownerLabel;

    if (ownerType === 'EVENT') {
      const event = await this.eventRepository.findByIdOrSlug(wallet.ownerId);
      if (!event) {
        logger.warn('Scheduled payout: event not found for wallet, skipping', { walletId: wallet.id, eventId: wallet.ownerId });
        return;
      }
      recipientUserId = event.creatorId;
      ownerLabel = event.title;
    } else {
      const group = await this.groupRepository.findById(wallet.ownerId);
      if (!group) {
        logger.warn('Scheduled payout: group not found for wallet, skipping', { walletId: wallet.id, groupId: wallet.ownerId });
        return;
      }
      recipientUserId = group.creator;
      ownerLabel = group.name;
    }

    const bankAccount = recipientUserId
      ? await this.bankAccountRepository.findDefaultByUser(recipientUserId)
      : null;

    if (!bankAccount) {
      summary.skippedNoBankAccount += 1;
      summary.ownerTypes[ownerType].skippedNoBankAccount += 1;
      logger.warn('Scheduled payout skipped - no default bank account on file', {
        walletId: wallet.id,
        ownerType,
        ownerId: wallet.ownerId,
        heldAmount
      });
      return; // heldForPayout is left untouched - retried automatically next Thursday
    }

    const feeAmount = WITHDRAWAL_FEE_FLAT;
    const payoutAmount = heldAmount - feeAmount;
    if (payoutAmount <= 0) {
      logger.warn('Scheduled payout skipped - held amount does not exceed the withdrawal fee', {
        walletId: wallet.id,
        ownerType,
        ownerId: wallet.ownerId,
        heldAmount
      });
      return;
    }

    // Debit the held amount before attempting the transfer - if the
    // process crashes between the debit and the transfer, the amount is
    // gone from heldForPayout, not from balance either, so it needs an
    // admin to reconcile rather than silently double-pay. A failed
    // transfer (caught below) explicitly credits it back.
    const debited = await this.walletRepository.debitHeldBalance(wallet.id, heldAmount);
    if (!debited) {
      logger.warn('Scheduled payout skipped - held balance changed concurrently', {
        walletId: wallet.id,
        ownerType,
        ownerId: wallet.ownerId
      });
      return;
    }

    const payoutReference = `wd_auto_${Date.now()}_${ownerType.toLowerCase()}_${wallet.ownerId}`;

    let transferResult;
    try {
      transferResult = await this.flutterwaveAdapter.createTransfer({
        amount: payoutAmount,
        bankCode: bankAccount.bankCode,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        reference: payoutReference,
        narration: `Jaaiye ${ownerType.toLowerCase()} scheduled payout`,
        currency: 'NGN'
      });
    } catch (transferError) {
      // Roll back into heldForPayout (not balance) - retried on next
      // Thursday's run directly, without waiting for another Tuesday hold.
      await this.walletRepository.creditHeldBalance(wallet.id, heldAmount);
      summary.failed += 1;
      summary.ownerTypes[ownerType].failed += 1;
      logger.error('Scheduled payout transfer failed, rolled back to held balance', {
        walletId: wallet.id,
        ownerType,
        ownerId: wallet.ownerId,
        heldAmount,
        error: transferError.message
      });
      return;
    }

    const withdrawal = await this.withdrawalRepository.create({
      wallet: wallet.id,
      ownerType,
      ownerId: wallet.ownerId,
      user: recipientUserId,
      amount: heldAmount,
      feeAmount,
      status: 'pending',
      payoutReference: transferResult.reference || payoutReference,
      bankAccount: bankAccount._id || bankAccount.id,
      metadata: {
        flutterwaveTransferId: transferResult.id,
        transferStatus: transferResult.status,
        automated: true,
        createdAt: new Date()
      }
    });

    // Credit the platform wallet with the withdrawal fee.
    const platformWallet = await this.walletRepository.findByOwner('PLATFORM', null);
    if (platformWallet) {
      const updatedPlatformWallet = await this.walletRepository.credit(platformWallet.id, feeAmount);
      await this.walletLedgerEntryRepository.create({
        walletId: platformWallet.id,
        type: 'FEE',
        direction: 'CREDIT',
        amount: feeAmount,
        balanceAfter: Number(updatedPlatformWallet.balance),
        ownerType: 'PLATFORM',
        ownerId: null,
        externalReference: payoutReference,
        metadata: { reason: 'scheduled_withdrawal_fee', sourceOwnerType: ownerType, sourceOwnerId: wallet.ownerId }
      });
    }

    await this.walletLedgerEntryRepository.create({
      walletId: wallet.id,
      type: 'WITHDRAWAL',
      direction: 'DEBIT',
      amount: heldAmount,
      balanceAfter: Number(debited.balance),
      ownerType,
      ownerId: wallet.ownerId,
      externalReference: payoutReference,
      metadata: { feeAmount, payoutAmount, automated: true, withdrawalId: withdrawal._id || withdrawal.id }
    });

    if (this.walletEmailAdapter) {
      try {
        await this.walletEmailAdapter.sendWithdrawalReceiptToAdmin({
          eventTitle: ownerLabel || 'Unknown',
          eventId: wallet.ownerId,
          userName: 'Scheduled payout',
          userEmail: null,
          amount: heldAmount,
          feeAmount,
          payoutAmount,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
          reference: transferResult.reference || payoutReference,
          requestedAt: new Date()
        });
      } catch (emailError) {
        logger.error('Failed to send scheduled payout receipt email', { error: emailError.message, walletId: wallet.id });
      }
    }

    summary.paid += 1;
    summary.totalPaid += heldAmount;
    summary.ownerTypes[ownerType].paid += 1;
    summary.ownerTypes[ownerType].totalPaid += heldAmount;
  }
}

module.exports = ProcessScheduledPayoutsUseCase;
