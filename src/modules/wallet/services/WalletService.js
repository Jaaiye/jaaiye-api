/**
 * WalletService
 * Domain-level wallet operations (funding side only for now).
 *
 * This service is framework-agnostic and delegates persistence to repositories.
 */

const { SERVICE_FEE_RATE } = require('../../../constants/paymentConstants');

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
   * Fund a wallet from a successful transaction with a 5% exclusive fee.
   *
   * - Wallet receives the netAmount (transaction.amount assumed to be net).
   * - Platform wallet receives 5% of netAmount as fee.
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

    const baseAmount = Number(transactionEntity.baseAmount || transactionEntity.amount || 0);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new Error('Invalid transaction amount for wallet funding');
    }

    // Use stored feeAmount if available, otherwise calculate the platform fee
    const fee = Number(transactionEntity.feeAmount) !== undefined && transactionEntity.feeAmount !== null
      ? Number(transactionEntity.feeAmount)
      : baseAmount * SERVICE_FEE_RATE;

    const netAmountForUser = baseAmount; // The full ticket price before platform fee

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

    // Credit owner wallet with the full ticket price, then debit the
    // platform fee back out - two atomic ops, each producing its own
    // ledger-accurate balanceAfter snapshot.
    wallet = await this.walletRepository.credit(wallet.id, netAmountForUser);
    const walletBalanceAfterFunding = Number(wallet.balance);

    wallet = await this.walletRepository.debit(wallet.id, fee);
    if (!wallet) {
      throw new Error('Failed to debit platform fee from wallet after funding');
    }
    const walletBalanceAfterFee = Number(wallet.balance);

    // Credit platform wallet with the fee
    const updatedPlatformWallet = await this.walletRepository.credit(platformWallet.id, fee);
    const platformBalanceAfterFee = Number(updatedPlatformWallet.balance);

    // Create ledger entries
    await this.walletLedgerEntryRepository.create({
      walletId: wallet.id,
      type: 'FUNDING',
      direction: 'CREDIT',
      amount: netAmountForUser,
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
      walletId: wallet.id,
      type: 'FEE',
      direction: 'DEBIT',
      amount: fee,
      balanceAfter: walletBalanceAfterFee,
      ownerType,
      ownerId,
      transactionId: transactionEntity.id,
      externalReference: transactionEntity.reference,
      metadata: {
        provider: transactionEntity.provider
      }
    });

    await this.walletLedgerEntryRepository.create({
      walletId: platformWallet.id,
      type: 'FEE',
      direction: 'CREDIT',
      amount: fee,
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
      walletBalance: walletBalanceAfterFee,
      platformBalance: platformBalanceAfterFee
    };
  }
}

module.exports = WalletService;


