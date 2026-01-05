/**
 * Set Primary Google Calendar DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class SetPrimaryGoogleCalendarDTO {
  constructor(data) {
    this.primaryId = data.primaryId;

    this.validate();
  }

  validate() {
    if (!this.primaryId || typeof this.primaryId !== 'string') {
      throw new ValidationError('primaryId is required and must be a string');
    }
  }
}

module.exports = SetPrimaryGoogleCalendarDTO;

