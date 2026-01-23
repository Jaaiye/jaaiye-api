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
    this.latitude = data.latitude !== undefined ? Number(data.latitude) : undefined;
    this.longitude = data.longitude !== undefined ? Number(data.longitude) : undefined;
    this.isAllDay = data.isAllDay;
    this.recurrence = data.recurrence;
    this.status = data.status;
    this.ticketFee = data.ticketFee;

    // Remove undefined values
    Object.keys(this).forEach(key => {
      if (this[key] === undefined) {
        delete this[key];
      }
    });
  }
}

module.exports = UpdateEventDTO;


