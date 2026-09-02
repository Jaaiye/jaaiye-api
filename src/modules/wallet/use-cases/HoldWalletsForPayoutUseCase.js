/**
 * Hold Wallets For Payout Use Case
 * Application layer - the Tuesday step of the weekly automated payout cycle.
 *
 * Locks in whatever each EVENT/GROUP wallet currently holds so it can be
 * paid out on Thursday. Anything credited to a wallet after this job runs
 * stays in `balance` untouched and simply waits for next week's hold.
 *
 * This exists because Flutterwave doesn't settle funds into the platform's
 * own account for 24-48h after a sale - holding on Tuesday for a Thursday
 * payout gives that settlement lag room to clear before money goes out.
 */

const logger = require('../../../utils/logger');

// Wallets holding ₦500 or less are not swept into a payout - the ₦50
// withdrawal fee would eat a disproportionate share (or all) of it.
const MIN_HOLD_AMOUNT = 500;

class HoldWalletsForPayoutUseCase {
  constructor({ walletRepository, walletLedgerEntryRepository }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
  }

  async execute() {
    const summary = { held: 0, totalHeld: 0, ownerTypes: {} };

    for (const ownerType of ['EVENT', 'GROUP']) {
      summary.ownerTypes[ownerType] = { held: 0, totalHeld: 0 };

      const eligibleWallets = await this.walletRepository.findAllByOwnerTypeWithBalance(
        ownerType,
        MIN_HOLD_AMOUNT
      );

      for (const wallet of eligibleWallets) {
        try {
          const heldAmount = Number(wallet.balance);
          const updatedWallet = await this.walletRepository.holdBalanceForPayout(
            wallet.id,
            MIN_HOLD_AMOUNT
          );

          if (!updatedWallet) {
            // Balance dropped below the floor between the query above and
            // this update (e.g. a refund landed in between) - nothing to hold.
            continue;
          }

          await this.walletLedgerEntryRepository.create({
            walletId: wallet.id,
            type: 'PAYOUT_HOLD',
            direction: 'DEBIT',
            amount: heldAmount,
            balanceAfter: Number(updatedWallet.balance),
            ownerType,
            ownerId: wallet.ownerId,
            metadata: {
              heldForPayoutAfter: Number(updatedWallet.heldForPayout),
              reason: 'weekly_payout_hold'
            }
          });

          summary.held += 1;
          summary.totalHeld += heldAmount;
          summary.ownerTypes[ownerType].held += 1;
          summary.ownerTypes[ownerType].totalHeld += heldAmount;
        } catch (error) {
          logger.error('Failed to hold wallet for payout', {
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
}

module.exports = HoldWalletsForPayoutUseCase;
