/**
 * WalletService
 * Domain-level wallet operations (funding side only for now).
 *
 * This service is framework-agnostic and delegates persistence to repositories.
 */

const { splitTotalIntoBaseAndFee } = require('../../payment/services/PricingService');

class WalletService {
  constructor({ walletRepository, walletLedgerEntryRepository }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
  }

  /**
   * Get or create the singleton platform wallet.
   * PLATFORM wallet has ownerType = 'PLATFORM' and null ownerId.
   */
  async getOrCreatePlatformWallet() {
    let wallet = await this.walletRepository.findByOwner('PLATFORM', null);
    if (!wallet) {
      wallet = await this.walletRepository.create({
        ownerType: 'PLATFORM',
        ownerId: null,
        balance: 0.0,
        currency: 'NGN'
      });
    }
    return wallet;
  }

  /**
   * Fund a wallet from a successful transaction.
   *
   * The buyer pays ticketPrice + serviceFee at checkout, so
   * transactionEntity.amount (the gateway-confirmed total) already
   * includes the fee. The fee never touches the owner's wallet - it's
   * split out of that confirmed total and routed straight to the
   * platform wallet, while the owner's wallet receives the full ticket
   * price.
   *
   * @param {Object} params
   * @param {string} params.ownerType - 'EVENT' | 'GROUP'
   * @param {string} params.ownerId
   * @param {Object} params.transactionEntity - TransactionEntity or plain object
   * @param {string} [params.hangoutId] - Optional hangout ID for group funding
   * @param {number} [params.settledAmount] - The amount that has been settled
   */
    async fundWalletFromTransaction({ ownerType, ownerId, transactionEntity, hangoutId, settledAmount }) {
    if (!transactionEntity || !transactionEntity.id) {
      throw new Error('transactionEntity with id is required');
    }

    // The amount the gateway ACTUALLY settled into our account (e.g. 2211.41
    // after Flutterwave's cut). Required for correct fee allocation - the
    // caller (PaymentService) passes this from the gateway-verified amount.
    const settled = Number(settledAmount ?? transactionEntity.amount ?? 0);
    if (!Number.isFinite(settled) || settled <= 0) {
      throw new Error('Invalid settled amount for wallet funding');
    }

    // The organizer is owed the FULL ticket price - never a portion of it.
    // Use transactionEntity.baseAmount (captured at checkout: ticket price *
    // quantity). Do NOT call splitTotalIntoBaseAndFee on any of these
    // numbers - that formula is the inverse of the checkout formula, and
    // feeding it the ticket price or the settled amount silently shrinks
    // the organizer's share.
    const baseAmount = Number(transactionEntity.baseAmount ?? 0);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new Error('transactionEntity.baseAmount is required to fund wallets');
    }
    if (baseAmount > settled) {
      throw new Error(`baseAmount (${baseAmount}) exceeds settled amount (${settled})`);
    }

    // Everything left after paying the organizer belongs to the platform.
    // This is where the gateway fee is naturally absorbed - it comes out of
    // the platform's share, never out of the organizer's ticket price.
    const feeAmount = settled - baseAmount;

    // Idempotency guard. If a previous attempt already credited this wallet
    // for this transaction, skip both the credit and the ledger write.
    // Without this, an admin-triggered retry (or any path that bypasses
    // claimForProcessing) double-credits.
    const [existingFunding, existingFee] = await Promise.all([
      this.walletLedgerEntryRepository.findByTransactionAndType(transactionEntity.id, 'FUNDING'),
      this.walletLedgerEntryRepository.findByTransactionAndType(transactionEntity.id, 'FEE')
    ]);

    if (existingFunding && existingFee) {
      // Both sides already credited - the transaction was fully funded on a
      // prior attempt. Return the current balances instead of re-crediting.
      const [currentWallet, currentPlatformWallet] = await Promise.all([
        this.walletRepository.findByOwner(ownerType, ownerId),
        this.getOrCreatePlatformWallet()
      ]);
      return {
        walletBalance: Number(currentWallet?.balance || 0),
        platformBalance: Number(currentPlatformWallet?.balance || 0),
        alreadyFunded: true
      };
    }

    // Get or create owner wallet
    let wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      wallet = await this.walletRepository.create({
        ownerType,
        ownerId,
        balance: 0.0,
        currency: transactionEntity.currency || 'NGN'
      });
    }

    // Get platform wallet
    const platformWallet = await this.getOrCreatePlatformWallet();

    // Credit owner wallet with the full ticket price - no fee deduction,
    // the fee was already collected from the buyer separately.
    let walletBalanceAfterFunding;
    if (!existingFunding) {
      wallet = await this.walletRepository.credit(wallet.id, baseAmount);
      walletBalanceAfterFunding = Number(wallet.balance);

      await this.walletLedgerEntryRepository.create({
        walletId: wallet.id,
        type: 'FUNDING',
        direction: 'CREDIT',
        amount: baseAmount,
        balanceAfter: walletBalanceAfterFunding,
        ownerType,
        ownerId,
        transactionId: transactionEntity.id,
        hangoutId: hangoutId || null,
        externalReference: transactionEntity.reference,
        metadata: { provider: transactionEntity.provider }
      });
    } else {
      const currentWallet = await this.walletRepository.findByOwner(ownerType, ownerId);
      walletBalanceAfterFunding = Number(currentWallet?.balance || 0);
    }

    // Credit platform wallet with everything left after paying the organizer.
    let platformBalanceAfterFee;
    if (!existingFee) {
      const updatedPlatformWallet = await this.walletRepository.credit(platformWallet.id, feeAmount);
      platformBalanceAfterFee = Number(updatedPlatformWallet.balance);

      await this.walletLedgerEntryRepository.create({
        walletId: platformWallet.id,
        type: 'FEE',
        direction: 'CREDIT',
        amount: feeAmount,
        balanceAfter: platformBalanceAfterFee,
        ownerType: 'PLATFORM',
        ownerId: null,
        transactionId: transactionEntity.id,
        externalReference: transactionEntity.reference,
        metadata: {
          provider: transactionEntity.provider,
          sourceOwnerType: ownerType,
          sourceOwnerId: ownerId
        }
      });
    } else {
      const currentPlatformWallet = await this.getOrCreatePlatformWallet();
      platformBalanceAfterFee = Number(currentPlatformWallet?.balance || 0);
    }

    return {
      walletBalance: walletBalanceAfterFunding,
      platformBalance: platformBalanceAfterFee
    };
  }
}

module.exports = WalletService;


