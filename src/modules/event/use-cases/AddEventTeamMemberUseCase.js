/**
 * Add Event Team Member Use Case
 * Application layer - add a team member (co-organizer or ticket scanner) to an event
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');
const { UserNotFoundError } = require('../../common/errors');

class AddEventTeamMemberUseCase {
  constructor({ eventRepository, eventTeamRepository, userRepository }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
    this.userRepository = userRepository;
  }

  async execute(eventId, userId, { teamMemberUserId, role }) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    // Only events (not hangouts) can have team members
    if (event.category !== 'event') {
      throw new ValidationError('Only ticketed events can have team members');
    }

    // Only event creator can add team members
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can add team members');
    }

    // Validate role
    if (!['co_organizer', 'ticket_scanner'].includes(role)) {
      throw new ValidationError('Invalid role. Must be co_organizer or ticket_scanner');
    }

    // Validate user exists
    const teamMember = await this.userRepository.findById(teamMemberUserId);
    if (!teamMember) {
      throw new UserNotFoundError();
    }

    // Cannot add yourself
    if (String(teamMemberUserId) === String(userId)) {
      throw new ValidationError('Cannot add yourself as a team member');
    }

    // Check if already a team member
    const existing = await this.eventTeamRepository.findByEventAndUser(eventId, teamMemberUserId);
    if (existing) {
      throw new ValidationError('User is already a team member');
    }

    // Create team member
    const teamMemberEntity = await this.eventTeamRepository.create({
      event: eventId,
      user: teamMemberUserId,
      role,
      invitedBy: userId,
      status: 'pending'
    });

    return teamMemberEntity;
  }
}

module.exports = AddEventTeamMemberUseCase;

