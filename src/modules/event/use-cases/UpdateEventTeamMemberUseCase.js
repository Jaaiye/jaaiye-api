/**
 * Update Event Team Member Use Case
 * Application layer - update a team member's role or status
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');

class UpdateEventTeamMemberUseCase {
  constructor({ eventRepository, eventTeamRepository }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  /**
   * Execute team member update
   * @param {string} eventId - Event ID
   * @param {string|null} teamMemberUserId - User ID of team member to update (null means updating self)
   * @param {string} requestingUserId - ID of user making the request
   * @param {Object} updateData - Update data containing role and/or status
   * @returns {Promise<Object>} Updated team member
   */
  async execute(eventId, teamMemberUserId, requestingUserId, { role, status }) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(eventId);
    let event;

    if (isObjectId) {
      event = await this.eventRepository.findById(eventId);
    } else {
      event = await this.eventRepository.findBySlug(eventId);
    }

    if (!event) {
      throw new EventNotFoundError();
    }

    // Determine which user's team membership to update
    const targetUserId = teamMemberUserId || requestingUserId;

    // Find team member
    const teamMember = await this.eventTeamRepository.findByEventAndUser(event._id || event.id, targetUserId);
    if (!teamMember) {
      throw new ValidationError('Team member not found');
    }

    // Cannot change creator role or status
    if (teamMember.role === 'creator') {
      throw new ValidationError('Cannot modify creator role or status');
    }

    // Validate and prepare update data
    const updates = {};

    if (status) {
      if (!['accepted', 'declined'].includes(status)) {
        throw new ValidationError('Invalid status. Must be accepted or declined');
      }
      updates.status = status;
    }

    if (role) {
      if (!['co_organizer', 'ticket_scanner'].includes(role)) {
        throw new ValidationError('Invalid role. Must be co_organizer or ticket_scanner');
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No update data provided');
    }

    // If user is accepting/declining their own invitation, allow it immediately
    const isUpdatingSelf = String(targetUserId) === String(requestingUserId);
    const isStatusUpdate = status && !role;

    if (isUpdatingSelf && isStatusUpdate) {
      const updated = await this.eventTeamRepository.update(teamMember.id, updates);
      return updated;
    }

    // For role changes or updating others, verify creator permission
    const isCreator = event.origin === 'user' &&
                      event.creatorId &&
                      String(event.creatorId) === String(requestingUserId);

    if (!isCreator) {
      throw new EventAccessDeniedError('Only the event creator can update team member roles or modify other members');
    }

    const updated = await this.eventTeamRepository.update(teamMember.id, updates);
    return updated;
  }
}

module.exports = UpdateEventTeamMemberUseCase;