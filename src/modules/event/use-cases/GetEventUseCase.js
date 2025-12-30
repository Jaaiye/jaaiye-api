/**
 * Get Event Use Case
 * Application layer - use case
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');

class GetEventUseCase {
  constructor({ eventRepository, calendarRepository, eventTeamRepository, userRepository }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventTeamRepository = eventTeamRepository;
    this.userRepository = userRepository;
  }

  async execute(eventId, userId = null) {
    // Try to find by ID first, then by slug
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

    // Check access if user is provided
    if (userId) {
      const calendar = await this.calendarRepository.findById(event.calendar);
      if (!calendar) {
        throw new EventNotFoundError();
      }

      if (!calendar.isPublic && !calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
        throw new EventAccessDeniedError();
      }
    }

    // Get event data
    const eventData = event.toJSON();

    // Check if user is a team member or has scanner/admin role (for scanner functionality)
    if (userId && event.category === 'event') {
      const teamMember = await this.eventTeamRepository.findByEventAndUser(event.id, userId);
      const isTeamMember = teamMember && teamMember.status === 'accepted';

      // Check user role
      const user = await this.userRepository.findById(userId);
      const hasScannerRole = user && ['scanner', 'admin', 'superadmin'].includes(user.role);

      eventData.isScanner = isTeamMember || hasScannerRole;
    } else {
      eventData.isScanner = false;
    }

    return eventData;
  }
}

module.exports = GetEventUseCase;

