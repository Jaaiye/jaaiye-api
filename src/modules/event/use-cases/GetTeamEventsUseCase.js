/**
 * Get Team Events Use Case
 * Application layer - get events where user is a co-organizer
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

    // Find all team memberships where user is co-organizer and accepted
    const teamMemberships = await this.eventTeamRepository.findByUser(userId);
    const coOrganizerMemberships = teamMemberships.filter(
      tm => tm.role === 'co_organizer' && tm.status === 'accepted'
    );

    if (coOrganizerMemberships.length === 0) {
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
    const eventIds = coOrganizerMemberships.map(tm => {
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
      const teamMember = coOrganizerMemberships.find(tm => String(tm.event) === String(event.id));
      const eventData = event.toJSON();
      eventData.teamRole = 'co_organizer';
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

