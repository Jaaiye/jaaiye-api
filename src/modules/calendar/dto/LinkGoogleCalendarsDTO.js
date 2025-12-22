/**
 * Link Google Calendars DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class LinkGoogleCalendarsDTO {
  constructor(data) {
    this.linkedIds = data.linkedIds;

    this.validate();
  }

  validate() {
    if (!Array.isArray(this.linkedIds)) {
      throw new ValidationError('linkedIds must be an array');
    }

    if (!this.linkedIds.every(id => typeof id === 'string' && id.trim().length > 0)) {
      throw new ValidationError('All linkedIds must be non-empty strings');
    }
  }
}

module.exports = LinkGoogleCalendarsDTO;

