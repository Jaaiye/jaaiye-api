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

  async execute(eventId, userId) {
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

    // Get event data
    const eventData = event.toJSON();

    // Check access if user is provided
    if (userId) {
      // Fetch user to check role (needed for both access check and scanner check)
      const user = await this.userRepository.findById(userId);
      const hasAdminRole = user && ['scanner', 'admin', 'superadmin'].includes(user.role);

      // Check if user is a team member (for events only)
      let isTeamMember = false;
      if (event.category === 'event') {
        const teamMember = await this.eventTeamRepository.findByEventAndUser(event.id, userId);
        isTeamMember = teamMember && teamMember.status === 'accepted';
      }

      // Published events are publicly accessible
      const isEventPublished = event.isPublished();

      // Admin/scanner roles, team members, and published events can be accessed
      if (!hasAdminRole && !isTeamMember && !isEventPublished) {
        const calendar = await this.calendarRepository.findById(event.calendar);
        if (!calendar) {
          throw new EventNotFoundError();
        }

        if (!calendar.isPublic && !calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
          throw new EventAccessDeniedError();
        }
      }

      // Set scanner flag for events
      if (event.category === 'event') {
        eventData.isScanner = isTeamMember || hasAdminRole;
      } else {
        eventData.isScanner = false;
      }
    } else {
      // For unauthenticated users, only allow access to published events
      if (!event.isPublished()) {
        throw new EventAccessDeniedError();
      }
      eventData.isScanner = false;
    }

    return eventData;
  }
}

module.exports = GetEventUseCase;

