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

  async execute(eventId, teamMemberUserId, userId, { role, status }) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    // Only event creator can update team members
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can update team members');
    }

    // Find team member
    const teamMember = await this.eventTeamRepository.findByEventAndUser(eventId, teamMemberUserId);
    if (!teamMember) {
      throw new ValidationError('Team member not found');
    }

    // Cannot change creator role
    if (teamMember.role === 'creator') {
      throw new ValidationError('Cannot modify creator role');
    }

    const updateData = {};
    if (role) {
      if (!['co_organizer', 'ticket_scanner'].includes(role)) {
        throw new ValidationError('Invalid role. Must be co_organizer or ticket_scanner');
      }
      updateData.role = role;
    }

    if (status) {
      if (!['pending', 'accepted', 'declined'].includes(status)) {
        throw new ValidationError('Invalid status. Must be pending, accepted, or declined');
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('No update data provided');
    }

    const updated = await this.eventTeamRepository.update(teamMember.id, updateData);
    return updated;
  }
}

module.exports = UpdateEventTeamMemberUseCase;

