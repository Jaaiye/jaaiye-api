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
    // userIds can be empty array (will just return current user's events)
    if (!Array.isArray(this.userIds)) {
      throw new ValidationError('userIds must be an array. If you want to fetch only your own events, provide an empty array [].');
    }

    // Validate userIds are strings (if provided)
    if (this.userIds.length > 0 && !this.userIds.every(id => typeof id === 'string' && id.trim().length > 0)) {
      throw new ValidationError('All userIds must be non-empty strings. Invalid userIds found in array.');
    }

    // Validate timeMin
    if (!this.timeMin) {
      throw new ValidationError('timeMin is required. Please provide a start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z).');
    }

    if (isNaN(new Date(this.timeMin).getTime())) {
      throw new ValidationError(`Invalid timeMin format: "${this.timeMin}". Expected ISO 8601 format (e.g., 2024-01-01T00:00:00Z).`);
    }

    // Validate timeMax
    if (!this.timeMax) {
      throw new ValidationError('timeMax is required. Please provide an end date in ISO 8601 format (e.g., 2024-01-31T23:59:59Z).');
    }

    if (isNaN(new Date(this.timeMax).getTime())) {
      throw new ValidationError(`Invalid timeMax format: "${this.timeMax}". Expected ISO 8601 format (e.g., 2024-01-31T23:59:59Z).`);
    }

    // Validate time range
    const timeMinDate = new Date(this.timeMin);
    const timeMaxDate = new Date(this.timeMax);

    if (timeMinDate >= timeMaxDate) {
      throw new ValidationError(`Invalid time range: timeMin (${this.timeMin}) must be before timeMax (${this.timeMax}). The start date must be earlier than the end date.`);
    }

    // Warn if time range is too large (optional validation)
    const daysDiff = (timeMaxDate - timeMinDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      throw new ValidationError(`Time range is too large: ${Math.round(daysDiff)} days. Maximum allowed range is 365 days. Please reduce the date range.`);
    }
  }
}

module.exports = GetSharedCalendarViewDTO;

