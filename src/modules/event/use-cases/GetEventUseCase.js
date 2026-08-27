/**
 * Get Event Use Case
 * Application layer - use case
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');

class GetEventUseCase {
  constructor({ eventRepository, calendarRepository, eventTeamRepository, userRepository, groupRepository }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventTeamRepository = eventTeamRepository;
    this.userRepository = userRepository;
    this.groupRepository = groupRepository;
  }

  async execute(eventId, userId) {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

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
        teamMember = await this.eventTeamRepository.findByEventAndUser(event._id || event.id, userId);
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

    // Include groupId for hangouts (inverse lookup)
    if (event.category === 'hangout') {
      const group = await this.groupRepository.findByEvent(event.id);
      if (group) {
        eventData.groupId = group.id;
      }
    }
    // Public event page — used for sharing, safe for every viewer.
    eventData.url = `https://events.jaaiye.com/events/${event.slug}`;

    // consoleUrl is the same URL as the public page — the web app
    // itself decides what to show (management options vs. the plain
    // public view) based on the viewer's role once they land there.
    // What matters here is *whether this field is present at all*:
    // only creators and co-organizer team members get it. The mobile
    // "Visit Console" button was previously reading eventData.url (the
    // public link, unconditionally present for every viewer) instead
    // of this gated field, which made the button show up for every
    // viewer, not just event managers.
    if (isCreator || (teamMember && teamMember.role === 'co_organizer')) {
      eventData.consoleUrl = `https://events.jaaiye.com/events/${event.slug}`;
    }

    // Creators and co-organizers cannot buy tickets to their own event
    eventData.canBuyTicket = !(isCreator || (teamMember && teamMember.role === 'co_organizer'));

    return eventData;
  }
}

module.exports = GetEventUseCase;