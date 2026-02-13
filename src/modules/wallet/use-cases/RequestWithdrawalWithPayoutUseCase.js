/**
 * Request Withdrawal With Payout Use Case
 * Application layer - orchestrates withdrawal request + Flutterwave transfer
 *
 * Flow:
 * 1. Validate permissions and balance
 * 2. Debit wallet (via WalletWithdrawalService)
 * 3. Get bank account (default or specified)
 * 4. Create Flutterwave transfer
 * 5. Create Withdrawal record
 * 6. Handle errors (rollback wallet if transfer fails)
 */

const logger = require('../../../utils/logger');

class RequestWithdrawalWithPayoutUseCase {
  constructor({
    walletWithdrawalService,
    walletRepository,
    walletLedgerEntryRepository,
    bankAccountRepository,
    withdrawalRepository,
    flutterwaveAdapter,
    walletEmailAdapter,
    eventRepository
  }) {
    this.walletWithdrawalService = walletWithdrawalService;
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
    this.bankAccountRepository = bankAccountRepository;
    this.withdrawalRepository = withdrawalRepository;
    this.flutterwaveAdapter = flutterwaveAdapter;
    this.walletEmailAdapter = walletEmailAdapter;
    this.eventRepository = eventRepository;
  }

  /**
   * Execute withdrawal request with payout
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'} params.ownerType
   * @param {string} params.ownerId
   * @param {string} params.requestedBy - userId
   * @param {number} params.amount
   * @param {string} [params.bankAccountId] - Optional, uses default if not provided
   */
  async execute({ ownerType, ownerId, requestedBy, amount, bankAccountId }) {
    // Validation: Amount range
    const MIN_AMOUNT = 10000; // ₦10,000
    const MAX_AMOUNT = 500000; // ₦500,000

    const withdrawalAmount = Number(amount);
    if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    if (withdrawalAmount < MIN_AMOUNT) {
      throw new Error(`Minimum withdrawal amount is ₦${MIN_AMOUNT.toLocaleString()}`);
    }

    if (withdrawalAmount > MAX_AMOUNT) {
      throw new Error(`Maximum withdrawal amount is ₦${MAX_AMOUNT.toLocaleString()}`);
    }

    // Validation: Rate limiting (2 withdrawals per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const recentWithdrawals = await this.withdrawalRepository.findByUser(requestedBy, {
      limit: 10,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const todayWithdrawals = recentWithdrawals.filter(w => {
      const withdrawalDate = new Date(w.createdAt);
      return withdrawalDate >= today && withdrawalDate < tomorrow;
    });

    if (todayWithdrawals.length >= 2) {
      throw new Error('You have reached the daily withdrawal limit (2 withdrawals per day)');
    }

    // Get bank account (default or specified)
    let bankAccount;
    if (bankAccountId) {
      bankAccount = await this.bankAccountRepository.findByIdForUser(bankAccountId, requestedBy);
      if (!bankAccount) {
        throw new Error('Bank account not found or does not belong to you');
      }
    } else {
      bankAccount = await this.bankAccountRepository.findDefaultByUser(requestedBy);
      if (!bankAccount) {
        throw new Error('No default bank account found. Please add a bank account first.');
      }
    }

    // Step 1: Debit wallet (via WalletWithdrawalService)
    let withdrawalResult;
    try {
      withdrawalResult = await this.walletWithdrawalService.requestWithdrawal({
        ownerType,
        ownerId,
        requestedBy,
        requestedAmount: withdrawalAmount,
        feeMode: 'EXCLUSIVE' // 5% service fee for EVENT withdrawals
      });
    } catch (error) {
      logger.error('Wallet withdrawal failed', {
        ownerType,
        ownerId,
        requestedBy,
        amount: withdrawalAmount,
        error: error.message
      });
      throw error; // Re-throw (permission/balance errors)
    }

    // Step 2: Create Flutterwave transfer
    let transferResult;
    const payoutReference = `wd_${Date.now()}_${ownerType.toLowerCase()}_${ownerId}`;
    const payoutAmount = withdrawalResult.payoutAmount;

    try {
      transferResult = await this.flutterwaveAdapter.createTransfer({
        amount: payoutAmount,
        bankCode: bankAccount.bankCode,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        reference: payoutReference,
        narration: `Jaaiye ${ownerType.toLowerCase()} wallet withdrawal`,
        currency: 'NGN'
      });
    } catch (transferError) {
      // Rollback: Credit wallet back if transfer creation fails
      logger.error('Flutterwave transfer creation failed, rolling back wallet debit', {
        ownerType,
        ownerId,
        requestedBy,
        amount: withdrawalAmount,
        error: transferError.message
      });

      try {
        const wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
        if (wallet) {
          const currentBalance = Number(wallet.balance || 0);
          const rollbackBalance = currentBalance + withdrawalAmount;
          await this.walletRepository.updateBalance(wallet.id, rollbackBalance);

          // Create reversal ledger entry
          await this.walletLedgerEntryRepository.create({
            walletId: wallet.id,
            type: 'ADJUSTMENT',
            direction: 'CREDIT',
            amount: withdrawalAmount,
            balanceAfter: rollbackBalance,
            ownerType,
            ownerId,
            metadata: {
              reason: 'withdrawal_transfer_failed_rollback',
              originalAmount: withdrawalAmount,
              transferError: transferError.message
            }
          });
        }
      } catch (rollbackError) {
        logger.error('Failed to rollback wallet after transfer creation failure', {
          ownerType,
          ownerId,
          error: rollbackError.message
        });
        // Critical: Log for manual intervention
      }

      throw new Error(`Failed to initiate transfer: ${transferError.message}`);
    }

    // Step 3: Get wallet to link withdrawal
    const wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      throw new Error('Wallet not found after withdrawal');
    }

    // Step 4: Create Withdrawal record
    const withdrawal = await this.withdrawalRepository.create({
      wallet: wallet.id,
      ownerType,
      ownerId,
      user: requestedBy,
      amount: withdrawalAmount,
      feeAmount: withdrawalResult.feeAmount || 0,
      status: 'pending',
      payoutReference: transferResult.reference || payoutReference,
      bankAccount: bankAccount._id || bankAccount.id,
      metadata: {
        flutterwaveTransferId: transferResult.id,
        transferStatus: transferResult.status,
        createdAt: new Date()
      }
    });

    // Step 5: Send withdrawal receipt email to admin
    if (this.walletEmailAdapter && ownerType === 'EVENT') {
      try {
        // Fetch event and user details for the email
        const event = await this.eventRepository.findByIdOrSlug(ownerId);
        const UserRepository = require('../../common/repositories/UserRepository');
        const userRepo = new UserRepository();
        const user = await userRepo.findById(requestedBy);

        await this.walletEmailAdapter.sendWithdrawalReceiptToAdmin({
          eventTitle: event?.title || 'Unknown Event',
          eventId: event?._id || event?.id || ownerId,
          userName: user?.username || user?.fullName || 'Unknown User',
          userEmail: user?.email,
          amount: withdrawalAmount,
          feeAmount: withdrawalResult.feeAmount || 0,
          payoutAmount: withdrawalResult.payoutAmount,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
          reference: transferResult.reference || payoutReference,
          requestedAt: new Date()
        });
      } catch (emailError) {
        // Log but don't fail the withdrawal if email fails
        logger.error('Failed to send withdrawal receipt email', {
          error: emailError.message,
          withdrawalId: withdrawal._id || withdrawal.id
        });
      }
    }

    return {
      withdrawal: {
        id: withdrawal._id || withdrawal.id,
        ownerType,
        ownerId,
        amount: withdrawalAmount,
        feeAmount: withdrawalResult.feeAmount || 0,
        status: 'pending',
        payoutReference: transferResult.reference || payoutReference,
        bankAccount: {
          bankName: bankAccount.bankName,
          accountNumber: `••${bankAccount.accountNumber.slice(-4)}`
        },
        createdAt: withdrawal.createdAt
      },
      walletBalanceAfter: withdrawalResult.walletBalanceAfter,
      transfer: {
        id: transferResult.id,
        reference: transferResult.reference || payoutReference,
        status: transferResult.status
      }
    };
  }
}

module.exports = RequestWithdrawalWithPayoutUseCase;

