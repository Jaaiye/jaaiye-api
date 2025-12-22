/**
 * Wallet Ledger Entry Entity
 * Immutable record of a single wallet balance change.
 */

class WalletLedgerEntryEntity {
  constructor({
    id,
    walletId,
    type,
    direction,
    amount,
    balanceAfter,
    ownerType,
    ownerId,
    transactionId,
    hangoutId,
    externalReference,
    metadata,
    createdAt
  }) {
    this.id = id;
    this.walletId = walletId;
    this.type = type; // 'FUNDING' | 'WITHDRAWAL' | 'FEE' | 'ADJUSTMENT'
    this.direction = direction; // 'CREDIT' | 'DEBIT'
    this.amount = amount; // DECIMAL(18,2)-style
    this.balanceAfter = balanceAfter;
    this.ownerType = ownerType; // denormalized from wallet
    this.ownerId = ownerId;
    this.transactionId = transactionId || null;
    this.hangoutId = hangoutId || null;
    this.externalReference = externalReference || null;
    this.metadata = metadata || {};
    this.createdAt = createdAt;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      walletId: this.walletId,
      type: this.type,
      direction: this.direction,
      amount: this.amount,
      balanceAfter: this.balanceAfter,
      ownerType: this.ownerType,
      ownerId: this.ownerId,
      transactionId: this.transactionId,
      hangoutId: this.hangoutId,
      externalReference: this.externalReference,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}

module.exports = WalletLedgerEntryEntity;


