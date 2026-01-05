/**
 * Get Event Team Use Case
 * Application layer - get all team members for an event
 */

const { EventNotFoundError } = require('../errors');

class GetEventTeamUseCase {
  constructor({ eventRepository, eventTeamRepository }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  async execute(eventId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    // Get all team members
    const teamMembers = await this.eventTeamRepository.findByEvent(eventId);

    return {
      team: teamMembers.map(member => ({
        id: member.id,
        user: member.user,
        role: member.role,
        status: member.status,
        invitedBy: member.invitedBy,
        permissions: member.permissions,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt
      })),
      total: teamMembers.length
    };
  }
}

module.exports = GetEventTeamUseCase;

