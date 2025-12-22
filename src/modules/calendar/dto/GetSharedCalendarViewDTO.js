/**
 * Get Shared Calendar View DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class GetSharedCalendarViewDTO {
  constructor(body) {
    // Handle userIds from request body
    let userIds = body.userIds;

    if (typeof userIds === 'string') {
      // Handle comma-separated string
      userIds = userIds.split(',').map(id => id.trim()).filter(id => id);
    } else if (Array.isArray(userIds)) {
      // Already an array
      userIds = userIds.filter(id => id);
    } else {
      userIds = [];
    }

    this.userIds = userIds;
    this.timeMin = body.timeMin;
    this.timeMax = body.timeMax;

    this.validate();
  }

  validate() {
    if (!Array.isArray(this.userIds) || this.userIds.length === 0) {
      throw new ValidationError('userIds array is required and must not be empty');
    }

    if (!this.timeMin || !this.timeMax) {
      throw new ValidationError('timeMin and timeMax are required (ISO strings)');
    }

    if (isNaN(new Date(this.timeMin).getTime()) || isNaN(new Date(this.timeMax).getTime())) {
      throw new ValidationError('Invalid date format. Use ISO 8601 strings');
    }

    if (new Date(this.timeMin) >= new Date(this.timeMax)) {
      throw new ValidationError('timeMin must be before timeMax');
    }

    // Validate userIds are strings
    if (!this.userIds.every(id => typeof id === 'string' && id.trim().length > 0)) {
      throw new ValidationError('All userIds must be non-empty strings');
    }
  }
}

module.exports = GetSharedCalendarViewDTO;

