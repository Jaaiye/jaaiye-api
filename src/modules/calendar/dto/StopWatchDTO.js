/**
 * Stop Watch DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class StopWatchDTO {
  constructor(data) {
    this.calendarId = data.calendarId;

    this.validate();
  }

  validate() {
    if (!this.calendarId || typeof this.calendarId !== 'string') {
      throw new ValidationError('calendarId is required and must be a string');
    }
  }
}

module.exports = StopWatchDTO;

