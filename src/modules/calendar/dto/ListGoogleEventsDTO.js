/**
 * List Google Events DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class ListGoogleEventsDTO {
  constructor(data) {
    this.timeMin = data.timeMin;
    this.timeMax = data.timeMax;
    this.includeAllDay = data.includeAllDay !== undefined ? data.includeAllDay : true;
    this.maxResults = data.maxResults || 100;
    this.viewType = data.viewType || 'monthly';

    this.validate();
  }

  validate() {
    if (!this.timeMin || !this.timeMax) {
      throw new ValidationError('timeMin and timeMax are required (ISO strings)');
    }

    if (isNaN(new Date(this.timeMin).getTime()) || isNaN(new Date(this.timeMax).getTime())) {
      throw new ValidationError('Invalid date format. Use ISO 8601 strings');
    }

    if (new Date(this.timeMin) >= new Date(this.timeMax)) {
      throw new ValidationError('timeMin must be before timeMax');
    }

    if (typeof this.includeAllDay !== 'boolean') {
      throw new ValidationError('includeAllDay must be a boolean');
    }

    if (typeof this.maxResults !== 'number' || this.maxResults < 1) {
      throw new ValidationError('maxResults must be a positive number');
    }
  }
}

module.exports = ListGoogleEventsDTO;

