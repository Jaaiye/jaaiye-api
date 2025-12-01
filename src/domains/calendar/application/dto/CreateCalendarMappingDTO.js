/**
 * Create Calendar Mapping DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../../shared/domain/errors');

class CreateCalendarMappingDTO {
  constructor(data) {
    this.googleCalendarId = data.googleCalendarId;
    this.jaaiyeCalendarId = data.jaaiyeCalendarId;

    this.validate();
  }

  validate() {
    if (!this.googleCalendarId || typeof this.googleCalendarId !== 'string') {
      throw new ValidationError('googleCalendarId is required and must be a string');
    }

    if (!this.jaaiyeCalendarId || typeof this.jaaiyeCalendarId !== 'string') {
      throw new ValidationError('jaaiyeCalendarId is required and must be a string');
    }
  }
}

module.exports = CreateCalendarMappingDTO;

