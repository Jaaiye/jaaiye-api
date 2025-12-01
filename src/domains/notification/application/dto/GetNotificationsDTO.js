/**
 * Get Notifications DTO
 * Application layer - data transfer object
 */

class GetNotificationsDTO {
  constructor(query) {
    this.page = Math.max(1, parseInt(query.page, 10) || 1);
    this.limit = Math.max(1, parseInt(query.limit, 10) || 20);
    this.read = query.read !== undefined ? query.read === 'true' : undefined;
    this.type = query.type;
    this.priority = query.priority;
  }

  getFilters() {
    const filters = {};

    if (this.read !== undefined) {
      filters.read = this.read;
    }

    if (this.type) {
      filters.type = this.type;
    }

    if (this.priority) {
      filters.priority = this.priority;
    }

    return filters;
  }

  getOptions() {
    return {
      limit: this.limit,
      skip: (this.page - 1) * this.limit,
      sort: { createdAt: -1 }
    };
  }
}

module.exports = GetNotificationsDTO;

