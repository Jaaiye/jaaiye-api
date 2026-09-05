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

/**
 * Determine if a user can manage (add/update/delete) ticket types for an event.
 * Mirrors the permission logic already used by the issueTicket controller
 * flow (event.controller.js) so all ticket-management entry points agree
 * on who counts as authorized.
 *
 * Rules:
 * - origin === 'jaaiye' -> platform-owned, no end-user management
 * - creatorId matches the requesting user -> allowed
 * - an accepted co_organizer/creator team member with the manageTickets
 *   permission -> allowed
 *
 * Team membership must be resolved by the caller and passed in - this
 * function stays pure/sync (no DB access) to match the rest of this file.
 *
 * @param {Object} params
 * @param {import('../entities/Event.entity')} params.eventEntity
 * @param {string} params.userId
 * @param {Object|null} [params.teamMember] - result of
 *   eventTeamRepository.findByEventAndUser(eventId, userId), or null/undefined
 *   if the caller didn't look one up (e.g. already matched as creator).
 * @returns {boolean}
 */
function canUserManageTicketTypes({ eventEntity, userId, teamMember = null }) {
  if (!eventEntity || !userId) return false;

  // Platform-owned events are not manageable by end-users via this path.
  if (eventEntity.origin === 'jaaiye') {
    return false;
  }

  if (eventEntity.creatorId && String(eventEntity.creatorId) === String(userId)) {
    return true;
  }

  return Boolean(
    teamMember &&
      teamMember.status === 'accepted' &&
      (teamMember.role === 'co_organizer' || teamMember.role === 'creator') &&
      teamMember.permissions?.manageTickets === true
  );
}

/**
 * Determine if a user can check in / scan tickets for an event.
 *
 * Rules:
 * - origin === 'jaaiye' -> platform-owned, no end-user check-in
 * - creatorId matches the requesting user -> allowed
 * - an accepted creator/co_organizer/ticket_scanner team member with the
 *   checkInTickets permission -> allowed
 *
 * Team membership must be resolved by the caller and passed in - this
 * function stays pure/sync (no DB access) to match the rest of this file.
 *
 * @param {Object} params
 * @param {import('../entities/Event.entity')} params.eventEntity
 * @param {string} params.userId
 * @param {Object|null} [params.teamMember] - result of
 *   eventTeamRepository.findByEventAndUser(eventId, userId), or null/undefined
 *   if the caller didn't look one up (e.g. already matched as creator).
 * @returns {boolean}
 */
function canUserCheckInTickets({ eventEntity, userId, teamMember = null }) {
  if (!eventEntity || !userId) return false;

  if (eventEntity.origin === 'jaaiye') {
    return false;
  }

  if (eventEntity.creatorId && String(eventEntity.creatorId) === String(userId)) {
    return true;
  }

  return Boolean(
    teamMember &&
      teamMember.status === 'accepted' &&
      ['creator', 'co_organizer', 'ticket_scanner'].includes(teamMember.role) &&
      teamMember.permissions?.checkInTickets === true
  );
}

module.exports = {
  canUserWithdrawFromEventWallet,
  canUserManageTicketTypes,
  canUserCheckInTickets
};


