/**
 * Get Free Busy DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../../shared/domain/errors');

class GetFreeBusyDTO {
  constructor(data) {
    this.timeMin = data.timeMin;
    this.timeMax = data.timeMax;
    this.calendarIds = data.calendarIds;

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

    if (this.calendarIds !== undefined && !Array.isArray(this.calendarIds)) {
      throw new ValidationError('calendarIds must be an array');
    }
  }
}

module.exports = GetFreeBusyDTO;

