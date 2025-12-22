/**
 * Event ownership and permissions service
 * Framework-agnostic helpers for deciding who controls an event financially.
 */

/**
 * Determine if a user can withdraw from the wallet associated with an event.
 * Rules (current/future-proof):
 * - origin === 'user'  -> only creatorId can withdraw
 * - origin === 'jaaiye' -> no end-user withdrawals (platform-owned)
 *
 * @param {Object} params
 * @param {import('../entities/Event.entity')} params.eventEntity
 * @param {string} params.userId
 * @returns {boolean}
 */
function canUserWithdrawFromEventWallet({ eventEntity, userId }) {
  if (!eventEntity || !userId) return false;

  // Platform-owned events (Jaaiye) should not be withdrawable by end-users
  if (eventEntity.origin === 'jaaiye') {
    return false;
  }

  // For user-originated events, require a normalized creatorId match
  if (!eventEntity.creatorId) {
    return false;
  }

  return String(eventEntity.creatorId) === String(userId);
}

module.exports = {
  canUserWithdrawFromEventWallet
};


