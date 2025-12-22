/**
 * Backfill Sync DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class BackfillSyncDTO {
  constructor(data) {
    this.calendarId = data.calendarId;
    this.daysBack = data.daysBack || 30;

    this.validate();
  }

  validate() {
    if (!this.calendarId || typeof this.calendarId !== 'string') {
      throw new ValidationError('calendarId is required and must be a string');
    }

    if (typeof this.daysBack !== 'number' || this.daysBack < 1 || this.daysBack > 365) {
      throw new ValidationError('daysBack must be a number between 1 and 365');
    }
  }
}

module.exports = BackfillSyncDTO;

