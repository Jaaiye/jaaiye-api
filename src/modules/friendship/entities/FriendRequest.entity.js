/**
 * Friend Request Domain Entity
 * Pure business logic, framework-agnostic
 */

class FriendRequestEntity {
  constructor({
    id,
    requester,
    recipient,
    status = 'pending',
    message,
    expiresAt,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.requester = requester;
    this.recipient = recipient;
    this.status = status;
    this.message = message;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Is request pending?
   * @returns {boolean}
   */
  isPending() {
    return this.status === 'pending';
  }

  /**
   * Business Rule: Is request accepted?
   * @returns {boolean}
   */
  isAccepted() {
    return this.status === 'accepted';
  }

  /**
   * Business Rule: Is request declined?
   * @returns {boolean}
   */
  isDeclined() {
    return this.status === 'declined';
  }

  /**
   * Business Rule: Is request cancelled?
   * @returns {boolean}
   */
  isCancelled() {
    return this.status === 'cancelled';
  }

  /**
   * Business Rule: Is request expired?
   * @returns {boolean}
   */
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Business Rule: Can be accepted?
   * @returns {boolean}
   */
  canBeAccepted() {
    return this.isPending() && !this.isExpired();
  }

  /**
   * Business Rule: Can be declined?
   * @returns {boolean}
   */
  canBeDeclined() {
    return this.isPending();
  }

  /**
   * Business Rule: Can be cancelled?
   * @returns {boolean}
   */
  canBeCancelled() {
    return this.isPending();
  }

  /**
   * Business Rule: Check if user is requester
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  isRequester(userId) {
    return this.requester.toString() === userId.toString();
  }

  /**
   * Business Rule: Check if user is recipient
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  isRecipient(userId) {
    return this.recipient.toString() === userId.toString();
  }

  /**
   * Convert entity to plain object
   * @returns {Object}
   */
  toObject() {
    const obj = {
      id: this.id,
      requester: this.requester,
      recipient: this.recipient,
      status: this.status,
      message: this.message,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    // Include populated user data if available
    if (this._populatedRequester) {
      obj.requester = this._populatedRequester;
    }
    if (this._populatedRecipient) {
      obj.recipient = this._populatedRecipient;
    }

    return obj;
  }
}

module.exports = FriendRequestEntity;


