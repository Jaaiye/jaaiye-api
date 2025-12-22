/**
 * Select Google Calendars DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class SelectGoogleCalendarsDTO {
  constructor(data) {
    this.action = data.action;
    this.calendarId = data.calendarId;

    this.validate();
  }

  validate() {
    if (!this.action || !['add', 'remove'].includes(this.action)) {
      throw new ValidationError('action is required and must be "add" or "remove"');
    }

    if (!this.calendarId || typeof this.calendarId !== 'string') {
      throw new ValidationError('calendarId is required and must be a string');
    }
  }
}

module.exports = SelectGoogleCalendarsDTO;

