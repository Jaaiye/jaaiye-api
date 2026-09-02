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
   */
  async fundWalletFromTransaction({ ownerType, ownerId, transactionEntity, hangoutId }) {
    if (!transactionEntity || !transactionEntity.id) {
      throw new Error('transactionEntity with id is required');
    }

    const totalAmount = Number(transactionEntity.amount || 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error('Invalid transaction amount for wallet funding');
    }

    const { baseAmount, feeAmount } = splitTotalIntoBaseAndFee(totalAmount);

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

    // Persist balance changes via atomic $inc operations rather than a
    // read-balance-then-$set - this wallet can be credited by many
    // concurrent ticket sales at once for a popular event, and a blind
    // $set from a stale read would silently lose other concurrent credits.
    // Note: in Mongo this won't be a true SQL transaction across the two
    // wallets; for now we rely on the order of operations and idempotent
    // transaction handling upstream.

    // Credit owner wallet with the full ticket price - no fee deduction,
    // the fee was already collected from the buyer separately.
    wallet = await this.walletRepository.credit(wallet.id, baseAmount);
    const walletBalanceAfterFunding = Number(wallet.balance);

    // Credit platform wallet with the fee portion of what the buyer paid.
    const updatedPlatformWallet = await this.walletRepository.credit(platformWallet.id, feeAmount);
    const platformBalanceAfterFee = Number(updatedPlatformWallet.balance);

    // Create ledger entries
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
      metadata: {
        provider: transactionEntity.provider
      }
    });

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

    return {
      walletBalance: walletBalanceAfterFunding,
      platformBalance: platformBalanceAfterFee
    };
  }
}

module.exports = WalletService;


