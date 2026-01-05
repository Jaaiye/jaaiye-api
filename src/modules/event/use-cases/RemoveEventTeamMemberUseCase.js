/**
 * Remove Event Team Member Use Case
 * Application layer - remove a team member from an event
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');

class RemoveEventTeamMemberUseCase {
  constructor({ eventRepository, eventTeamRepository }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  async execute(eventId, teamMemberUserId, userId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    // Only event creator can remove team members
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can remove team members');
    }

    // Find team member
    const teamMember = await this.eventTeamRepository.findByEventAndUser(eventId, teamMemberUserId);
    if (!teamMember) {
      throw new ValidationError('Team member not found');
    }

    // Cannot remove creator
    if (teamMember.role === 'creator') {
      throw new ValidationError('Cannot remove creator');
    }

    // Remove team member
    await this.eventTeamRepository.deleteByEventAndUser(eventId, teamMemberUserId);
    return { success: true };
  }
}

module.exports = RemoveEventTeamMemberUseCase;

