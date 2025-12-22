/**
 * Adjust Wallet Balance Use Case
 * Application layer - admin-only manual wallet adjustments
 */

class AdjustWalletBalanceUseCase {
  constructor({
    walletRepository,
    walletLedgerEntryRepository,
    eventRepository,
    groupRepository,
    userRepository,
    walletNotificationService
  }) {
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.walletNotificationService = walletNotificationService;
  }

  /**
   * Manually adjust a wallet balance (admin/superadmin only).
   *
   * @param {Object} params
   * @param {'EVENT'|'GROUP'|'PLATFORM'} params.ownerType
   * @param {string|null} params.ownerId
   * @param {number} params.amount - Positive for credit, negative for debit
   * @param {string} params.reason - Reason for adjustment
   * @param {string} params.adjustedBy - Admin user ID
   */
  async execute({ ownerType, ownerId, amount, reason, adjustedBy }) {
    if (!ownerType) {
      throw new Error('ownerType is required');
    }

    if (ownerType !== 'PLATFORM' && !ownerId) {
      throw new Error('ownerId is required for non-platform wallets');
    }

    const adjustmentAmount = Number(amount);
    if (!Number.isFinite(adjustmentAmount) || adjustmentAmount === 0) {
      throw new Error('Amount must be a non-zero number');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new Error('Reason is required for wallet adjustments');
    }

    if (!adjustedBy) {
      throw new Error('adjustedBy (admin user ID) is required');
    }

    // Get or create wallet
    let wallet = await this.walletRepository.findByOwner(ownerType, ownerId);
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await this.walletRepository.create({
        ownerType,
        ownerId: ownerType === 'PLATFORM' ? null : ownerId,
        balance: 0.0,
        currency: 'NGN'
      });
    }

    const balanceBefore = Number(wallet.balance || 0);
    const balanceAfter = balanceBefore + adjustmentAmount;

    // Update wallet balance
    await this.walletRepository.updateBalance(wallet.id, balanceAfter);

    // Create ledger entry
    await this.walletLedgerEntryRepository.create({
      walletId: wallet.id,
      type: 'ADJUSTMENT',
      direction: adjustmentAmount > 0 ? 'CREDIT' : 'DEBIT',
      amount: Math.abs(adjustmentAmount),
      balanceAfter,
      ownerType,
      ownerId: ownerType === 'PLATFORM' ? null : ownerId,
      metadata: {
        reason: reason.trim(),
        adjustedBy,
        adjustmentType: 'manual'
      }
    });

    // Send notification email to wallet owner (if applicable)
    if (this.walletNotificationService && ownerType !== 'PLATFORM') {
      try {
        let owner = null;
        let ownerLabel = null;

        if (ownerType === 'EVENT') {
          const event = await this.eventRepository.findById(ownerId);
          if (event && event.origin === 'user' && event.creatorId) {
            owner = await this.userRepository.findById(event.creatorId);
            ownerLabel = event.title;
          }
        } else if (ownerType === 'GROUP') {
          const group = await this.groupRepository.findById(ownerId);
          if (group && group.creator) {
            owner = await this.userRepository.findById(group.creator);
            ownerLabel = group.name;
          }
        }

        if (owner && owner.email) {
          await this.walletNotificationService.sendWalletAdjustedManualEmail({
            user: owner,
            ownerLabel,
            amount: adjustmentAmount,
            reason: reason.trim(),
            walletBalanceAfter: balanceAfter
          });
        }
      } catch (emailError) {
        // Don't fail the adjustment if email fails
        console.error('Failed to send adjustment notification email', {
          ownerType,
          ownerId,
          error: emailError.message
        });
      }
    }

    return {
      walletId: wallet.id,
      ownerType,
      ownerId,
      balanceBefore,
      balanceAfter,
      adjustmentAmount
    };
  }
}

module.exports = AdjustWalletBalanceUseCase;

