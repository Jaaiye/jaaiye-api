/**
 * Create Event DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class CreateEventDTO {
  constructor(data) {
    this.calendarId = data.calendarId;
    this.googleCalendarId = data.googleCalendarId;
    this.title = data.title;
    this.description = data.description;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.venue = data.venue;
    this.category = data.category;
    this.ticketFee = data.ticketFee;
    this.ticketTypes = data.ticketTypes;
    this.isAllDay = data.isAllDay;
    this.recurrence = data.recurrence;
    // Parse participants if provided (only for hangouts)
    if (data.participants !== undefined && data.participants !== null && data.participants !== '') {
      if (typeof data.participants === 'string') {
        this.participants = JSON.parse(data.participants);
      } else if (Array.isArray(data.participants)) {
        this.participants = data.participants;
      } else {
        this.participants = [];
      }
    } else {
      this.participants = undefined;
    }
    this.groupId = data.groupId; // Optional, only for hangouts

    this.validate();
  }

  validate() {
    if (!this.title || typeof this.title !== 'string' || !this.title.trim()) {
      throw new ValidationError('Title is required');
    }

    if (!this.startTime) {
      throw new ValidationError('Start time is required');
    }

    const startDate = new Date(this.startTime);
    if (isNaN(startDate.getTime())) {
      throw new ValidationError('Start time must be a valid date');
    }

    if (this.endTime) {
      const endDate = new Date(this.endTime);
      if (isNaN(endDate.getTime())) {
        throw new ValidationError('End time must be a valid date');
      }
      if (endDate < startDate) {
        throw new ValidationError('End time must be after start time');
      }
    }

    if (this.category && !['hangout', 'event'].includes(this.category)) {
      throw new ValidationError('Category must be either "hangout" or "event"');
    }

    if (this.category === 'hangout' && (this.ticketFee || (Array.isArray(this.ticketTypes) && this.ticketTypes.length > 0))) {
      throw new ValidationError('Hangouts cannot include tickets');
    }

    if (this.category === 'event' && !this.ticketFee && (!Array.isArray(this.ticketTypes) || this.ticketTypes.length === 0)) {
      throw new ValidationError('Events require ticket information');
    }

    // Hangouts require participants
    const category = this.category ? String(this.category).toLowerCase() : 'hangout';
    if (category === 'hangout') {
      if (!Array.isArray(this.participants) || this.participants.length === 0) {
        throw new ValidationError('Hangouts require at least one participant');
      }
    }

    // groupId is only valid for hangouts
    if (this.groupId && category !== 'hangout') {
      throw new ValidationError('groupId can only be provided for hangouts');
    }

    // Validate participants if provided
    if (this.participants !== undefined && this.participants !== null) {
      if (!Array.isArray(this.participants)) {
        throw new ValidationError('Participants must be an array');
      }

      this.participants.forEach((participant, index) => {
        if (!participant || typeof participant !== 'object') {
          throw new ValidationError(`Participant at index ${index} must be an object`);
        }

        const userId = participant.userId || participant.user;
        if (!userId) {
          throw new ValidationError(`Participant at index ${index} must have userId or user`);
        }

        if (participant.role && !['organizer', 'attendee'].includes(participant.role)) {
          throw new ValidationError(`Participant at index ${index} has invalid role`);
        }
      });
    }
  }
}

module.exports = CreateEventDTO;

