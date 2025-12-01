/**
 * Update Event DTO
 * Application layer - data transfer object
 */

class UpdateEventDTO {
  constructor(data) {
    this.title = data.title;
    this.description = data.description;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.venue = data.venue;
    this.isAllDay = data.isAllDay;
    this.recurrence = data.recurrence;
    this.status = data.status;

    // Remove undefined values
    Object.keys(this).forEach(key => {
      if (this[key] === undefined) {
        delete this[key];
      }
    });
  }
}

module.exports = UpdateEventDTO;

