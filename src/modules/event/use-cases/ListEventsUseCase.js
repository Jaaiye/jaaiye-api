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

    // Handle scope
    if (dto.scope === 'jaaiye') {
      filters.createdBy = 'Jaaiye';
    } else if (!userId) {
      // Unauthenticated users - can only view events with category 'event'
      // No hangouts, even if they're in public calendars
      if (dto.category === 'hangout') {
        // Unauthenticated users cannot view hangouts
        return { events: [], pagination: { page: dto.page, limit: dto.limit, total: 0, pages: 0 } };
      }

      // Show all events with category 'event' (no calendar restriction)
      filters.category = 'event';
    } else {
      let calendarIds;

      if (dto.calendarId) {
        const calendar = await this.calendarRepository.findById(dto.calendarId);
        if (!calendar) {
          return { events: [], pagination: { page: dto.page, limit: dto.limit, total: 0, pages: 0 } };
        }

        // Check access
        if (!calendar.isPublic && !calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
          throw new Error('Access denied');
        }

        calendarIds = [calendar.id];
      } else {
        const calendars = await this.calendarRepository.findAccessibleByUser(userId);
        calendarIds = calendars.map(c => c.id);
      }

      // Handle scope-specific filters
      if (dto.scope === 'creator') {
        // For 'creator' scope: only events created by user
        filters.createdBy = userId;

        // Optionally filter by calendar if calendars exist
        if (calendarIds.length > 0) {
          const mongoose = require('mongoose');
          const objectCalendarIds = calendarIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
          filters.calendar = objectCalendarIds.length === 1 ? objectCalendarIds[0] : { $in: objectCalendarIds };
        }
      } else if (dto.scope === 'mine') {
        // For 'mine' scope: events created by user OR events user is participating in
        const participatingEventIds = await this.eventParticipantRepository.findByUser(userId);
        const eventIds = participatingEventIds.map(p => p.event);

        const mongoose = require('mongoose');
        const objectEventIds = eventIds.length > 0
          ? eventIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)
          : [];

        if (calendarIds.length > 0) {
          // User has calendars - filter by calendar AND (created by user OR participating)
          const objectCalendarIds = calendarIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
          filters.calendar = objectCalendarIds.length === 1 ? objectCalendarIds[0] : { $in: objectCalendarIds };

          if (objectEventIds.length > 0) {
            filters.$or = [
              { createdBy: userId },
              { _id: { $in: objectEventIds } }
            ];
          } else {
            filters.createdBy = userId;
          }
        } else {
          // No calendars - just filter by created by user OR participating
          if (objectEventIds.length > 0) {
            filters.$or = [
              { createdBy: userId },
              { _id: { $in: objectEventIds } }
            ];
          } else {
            filters.createdBy = userId;
          }
        }
      } else {
        // For 'all' scope: events in accessible calendars OR events user is participating in
        const participatingEventIds = await this.eventParticipantRepository.findByUser(userId);
        const eventIds = participatingEventIds.map(p => p.event);

        const mongoose = require('mongoose');
        const objectEventIds = eventIds.length > 0
          ? eventIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)
          : [];

        if (calendarIds.length > 0) {
          // User has calendars - filter by calendar OR participating events
          const objectCalendarIds = calendarIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);

          if (objectEventIds.length > 0) {
            // Include events in accessible calendars OR events user is participating in
            filters.$or = [
              { calendar: objectCalendarIds.length === 1 ? objectCalendarIds[0] : { $in: objectCalendarIds } },
              { _id: { $in: objectEventIds } }
            ];
          } else {
            // Only filter by calendar
            filters.calendar = objectCalendarIds.length === 1 ? objectCalendarIds[0] : { $in: objectCalendarIds };
          }
        } else {
          // No calendars - only show events user is participating in
          if (objectEventIds.length > 0) {
            filters._id = { $in: objectEventIds };
          } else {
            // No calendars and no participating events - return empty
            return { events: [], pagination: { page: dto.page, limit: dto.limit, total: 0, pages: 0 } };
          }
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

