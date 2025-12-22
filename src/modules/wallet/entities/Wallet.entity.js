/**
 * Wallet Entity
 * Core business representation of a wallet.
 */

class WalletEntity {
  constructor({
    id,
    ownerType,
    ownerId,
    balance,
    currency = 'NGN',
    isActive = true,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.ownerType = ownerType; // 'EVENT' | 'GROUP' | 'PLATFORM'
    this.ownerId = ownerId; // stringified ObjectId or null for PLATFORM
    this.balance = balance; // string or number representing DECIMAL(18,2)
    this.currency = currency;
    this.isActive = isActive !== undefined ? isActive : true;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      ownerType: this.ownerType,
      ownerId: this.ownerId,
      balance: this.balance,
      currency: this.currency,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = WalletEntity;


