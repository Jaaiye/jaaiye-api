/**
 * List Events Use Case
 * Application layer - use case
 */

class ListEventsUseCase {
  constructor({ eventRepository, calendarRepository, eventParticipantRepository }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventParticipantRepository = eventParticipantRepository;
  }

  async execute(userId, dto) {
    const filters = dto.getFilters();
    const options = dto.getOptions();

    // The user wants fixed logic regardless of input:
    // 1. Events -> always fetch all
    // 2. Hangouts -> only mine

    if (dto.category === 'event') {
      // For 'event', we always fetch all events
      filters.category = 'event';
      // No calendar or scope restrictions applied to events
    } else if (dto.category === 'hangout') {
      // For 'hangout', we only fetch the user's own hangouts
      if (!userId) {
        // Unauthenticated users cannot view hangouts
        return { events: [], pagination: { page: dto.page, limit: dto.limit, total: 0, pages: 0 } };
      }

      filters.category = 'hangout';

      // Force 'mine' logic: created by user OR participating
      const participatingEventIds = await this.eventParticipantRepository.findByUser(userId);
      const eventIds = participatingEventIds.map(p => p.event);

      const mongoose = require('mongoose');
      const objectEventIds = eventIds.length > 0
        ? eventIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)
        : [];

      if (objectEventIds.length > 0) {
        filters.$or = [
          { createdBy: userId },
          { _id: { $in: objectEventIds } }
        ];
      } else {
        filters.createdBy = userId;
      }
    } else {
      // category === 'all' (default or explicitly passed)
      if (!userId) {
        // Unauthenticated users only see public events
        filters.category = 'event';
      } else {
        // Authenticated users see ALL categories: All Events + My Hangouts
        const participatingEventIds = await this.eventParticipantRepository.findByUser(userId);
        const eventIds = participatingEventIds.map(p => p.event);

        const mongoose = require('mongoose');
        const objectEventIds = eventIds.length > 0
          ? eventIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)
          : [];

        filters.$or = [
          { category: 'event' }, // All events
          {
            category: 'hangout',
            $or: [
              { createdBy: userId },
              { _id: { $in: objectEventIds.length > 0 ? objectEventIds : [] } }
            ].filter(cond => {
              if (cond._id && cond._id.$in.length === 0) return false;
              return true;
            })
          }
        ];

        // If no participating events, simplify the hangout part
        if (objectEventIds.length === 0) {
          filters.$or[1] = { category: 'hangout', createdBy: userId };
        }
      }
    }

    const { events, total } = await this.eventRepository.find(filters, options);

    return {
      events: events.map(e => e.toJSON()),
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        pages: Math.ceil(total / dto.limit)
      }
    };
  }
}

module.exports = ListEventsUseCase;
