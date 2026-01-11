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

    // Initialize variables that need to persist outside the userId block
    let isCreator = false;
    let isTeamMember = false;
    let teamMember = null;
    let hasAdminRole = false;

    // Check access if user is provided
    if (userId) {
      // Fetch user to check role (needed for both access check and scanner check)
      const user = await this.userRepository.findById(userId);
      hasAdminRole = user && ['scanner', 'admin', 'superadmin'].includes(user.role);

      // Check if user is the creator
      isCreator = event.creatorId && String(event.creatorId) === String(userId);

      // Check if user is a team member (for events only)
      if (event.category === 'event') {
        teamMember = await this.eventTeamRepository.findByEventAndUser(event.id, userId);
        isTeamMember = teamMember && teamMember.status === 'accepted';
      }

      // Published events are publicly accessible
      const isEventPublished = event.isPublished();

      // Admin/scanner roles, team members, creators, and published events can be accessed
      if (!hasAdminRole && !isTeamMember && !isCreator && !isEventPublished) {
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
        eventData.isScanner = isCreator || isTeamMember || hasAdminRole;
      } else {
        eventData.isScanner = false;
      }

      // Add user's role and permissions for events
      if (event.category === 'event') {
        if (isCreator) {
          eventData.userRole = 'creator';
          eventData.userPermissions = {
            editEvent: true,
            manageTickets: true,
            viewAnalytics: true,
            viewWallet: true,
            requestWithdrawal: true,
            checkInTickets: true,
            manageTeam: true
          };
        } else if (isTeamMember && teamMember) {
          eventData.userRole = teamMember.role; // 'co_organizer' or 'ticket_scanner'
          eventData.userPermissions = teamMember.permissions || {};
          // Co-organizers can do everything except withdraw and manage team
          if (teamMember.role === 'co_organizer') {
            eventData.userPermissions.manageTeam = false;
            eventData.userPermissions.requestWithdrawal = false;
          }
        } else {
          eventData.userRole = null;
          eventData.userPermissions = null;
        }
      }
    } else {
      // For unauthenticated users, only allow access to published events
      if (!event.isPublished()) {
        throw new EventAccessDeniedError();
      }
      eventData.isScanner = false;
    }

    // Add URL for creators and co-organizers
    if (isCreator || (teamMember && teamMember.role === 'co_organizer')) {
      eventData.url = `https://events.jaaiye.com/events/${event.slug}`;
    }

    return eventData;
  }
}

module.exports = GetEventUseCase;