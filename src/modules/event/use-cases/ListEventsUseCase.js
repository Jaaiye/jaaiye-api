/**
 * List Events Use Case
 * Application layer - use case
 */

class ListEventsUseCase {
  constructor({ eventRepository, calendarRepository, eventParticipantRepository, userRepository }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.userRepository = userRepository;
  }

  async execute(userId, dto) {
    const filters = dto.getFilters();
    const options = dto.getOptions();

    // Check if user is a guest
    const user = userId ? await this.userRepository.findById(userId) : null;
    const isGuest = user && user.isGuest;

    const isMineScope = dto.scope === 'mine' || dto.scope === 'creator';

    // Helper to get participating events
    const getParticipatingFilter = async (uid) => {
      const participations = await this.eventParticipantRepository.findByUser(uid);
      const eventIds = participations.map(p => p.event);

      const mongoose = require('mongoose');
      return eventIds.length > 0
        ? eventIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)
        : [];
    };

    if (dto.category === 'event') {
      filters.category = 'event';

      if (isMineScope && userId && !isGuest) {
        const objectEventIds = await getParticipatingFilter(userId);
        filters.$or = [
          { creatorId: userId },
          { _id: { $in: objectEventIds } }
        ];
      }
    } else if (dto.category === 'hangout') {
      if (!userId || isGuest) {
        return { events: [], pagination: { page: dto.page, limit: dto.limit, total: 0, pages: 0 } };
      }

      filters.category = 'hangout';
      const objectEventIds = await getParticipatingFilter(userId);

      filters.$or = [
        { creatorId: userId },
        { _id: { $in: objectEventIds } }
      ];
    } else {
      // category === 'all'
      if (!userId || isGuest) {
        filters.category = 'event';
      } else if (isMineScope) {
        const objectEventIds = await getParticipatingFilter(userId);
        filters.$or = [
          { creatorId: userId },
          { _id: { $in: objectEventIds } }
        ];
      } else {
        const objectEventIds = await getParticipatingFilter(userId);

        filters.$or = [
          { category: 'event' }, // All public events
          {
            category: 'hangout',
            $or: [
              { creatorId: userId },
              { _id: { $in: objectEventIds } }
            ]
          }
        ];
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
