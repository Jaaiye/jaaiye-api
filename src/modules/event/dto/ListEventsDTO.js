/**
 * List Events DTO
 * Application layer - data transfer object
 */

class ListEventsDTO {
  constructor(query) {
    this.calendarId = query.calendarId;
    this.startDate = query.startDate;
    this.endDate = query.endDate;
    this.category = query.category || 'all';
    this.scope = query.scope || 'all';
    this.upcoming = query.upcoming !== undefined ? query.upcoming === 'true' || query.upcoming === true : undefined;
    this.limit = Math.max(1, parseInt(query.limit, 10) || 20);
    this.page = Math.max(1, parseInt(query.page, 10) || 1);
  }

  getFilters() {
    const filters = {};

    if (this.category !== 'all') {
      filters.category = this.category;
    }

    // Handle date range and upcoming filter
    if (this.startDate || this.endDate || this.upcoming !== undefined) {
      filters.startTime = {};

      if (this.startDate) {
        filters.startTime.$gte = new Date(this.startDate);
      }

      if (this.endDate) {
        filters.startTime.$lte = new Date(this.endDate);
      }

      // Filter upcoming events (startTime > now) or past events (startTime <= now)
      if (this.upcoming !== undefined) {
        const now = new Date();
        if (this.upcoming === true) {
          // Upcoming events: startTime > now
          filters.startTime.$gt = now;
        } else {
          // Past events: startTime <= now
          filters.startTime.$lte = now;
        }
      }
    } else if (this.upcoming !== undefined) {
      // Only upcoming filter, no date range
      const now = new Date();
      filters.startTime = {};
      if (this.upcoming === true) {
        filters.startTime.$gt = now;
      } else {
        filters.startTime.$lte = now;
      }
    }

    return filters;
  }

  getOptions() {
    return {
      limit: this.limit,
      skip: (this.page - 1) * this.limit,
      sort: { startTime: 1 }
    };
  }
}

module.exports = ListEventsDTO;

