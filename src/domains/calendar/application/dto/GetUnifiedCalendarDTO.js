/**
 * Get Unified Calendar DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../../shared/domain/errors');

class GetUnifiedCalendarDTO {
  constructor(query) {
    this.timeMin = query.timeMin;
    this.timeMax = query.timeMax;
    this.includeJaaiye = query.includeJaaiye !== undefined ? query.includeJaaiye === 'true' || query.includeJaaiye === true : true;
    this.includeGoogle = query.includeGoogle !== undefined ? query.includeGoogle === 'true' || query.includeGoogle === true : true;
    this.viewType = query.viewType || 'monthly';

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
  }
}

module.exports = GetUnifiedCalendarDTO;

