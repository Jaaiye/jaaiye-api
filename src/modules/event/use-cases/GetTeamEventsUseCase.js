/**
 * Get Team Events Use Case
 * Application layer - get events where the user is an accepted team member
 * (co-organizer or ticket scanner)
 */

const { ValidationError } = require('../errors');

class GetTeamEventsUseCase {
  constructor({ eventRepository, eventTeamRepository }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  async execute(userId, { status, page = 1, limit = 12 }) {
    // Validate status filter if provided
    if (status && !['scheduled', 'cancelled', 'completed'].includes(status)) {
      throw new ValidationError('Invalid status. Must be scheduled, cancelled, or completed');
    }

    // Find all accepted co-organizer/ticket-scanner team memberships.
    // This previously only included 'co_organizer', which meant a
    // ticket_scanner team member had no way to discover which events they
    // were added to - the mobile scanner UI has nothing to route them to.
    const teamMemberships = await this.eventTeamRepository.findByUser(userId);
    const teamEventMemberships = teamMemberships.filter(
      tm => ['co_organizer', 'ticket_scanner'].includes(tm.role) && tm.status === 'accepted'
    );

    if (teamEventMemberships.length === 0) {
      return {
        events: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      };
    }

    // Get event IDs - ensure they're strings/ObjectIds
    const eventIds = teamEventMemberships.map(tm => {
      const eventId = tm.event;
      // If event is an object (populated), extract the ID
      if (eventId && typeof eventId === 'object' && eventId.id) {
        return eventId.id;
      }
      // Otherwise, convert to string
      return String(eventId);
    }).filter(id => id); // Filter out any null/undefined values

    // Build query
    const query = {
      _id: { $in: eventIds },
      category: 'event' // Only ticketed events can have team members
    };

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get events with pagination
    const result = await this.eventRepository.find(query, {
      skip,
      limit: limitNum,
      sort: { startTime: -1 } // Most recent first
    });

    // Map events and include team member info
    const eventsWithRole = result.events.map(event => {
      const teamMember = teamEventMemberships.find(tm => String(tm.event) === String(event.id));
      const eventData = event.toJSON();
      eventData.teamRole = teamMember?.role || 'co_organizer';
      eventData.teamPermissions = teamMember?.permissions || {};
      return eventData;
    });

    return {
      events: eventsWithRole,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum)
      }
    };
  }
}

module.exports = GetTeamEventsUseCase;

