/**
 * Get Monthly Calendar DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../../shared/domain/errors');

class GetMonthlyCalendarDTO {
  constructor(params, query) {
    this.year = parseInt(params.year);
    this.month = parseInt(params.month);
    this.includeJaaiye = query.includeJaaiye !== undefined ? query.includeJaaiye === 'true' || query.includeJaaiye === true : true;
    this.includeGoogle = query.includeGoogle !== undefined ? query.includeGoogle === 'true' || query.includeGoogle === true : true;

    this.validate();
  }

  validate() {
    if (isNaN(this.year) || isNaN(this.month) || this.month < 1 || this.month > 12) {
      throw new ValidationError('Invalid year or month');
    }
  }
}

module.exports = GetMonthlyCalendarDTO;

