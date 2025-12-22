/**
 * Add Participants DTO
 * Application layer - data transfer object
 * Accepts single participant or array of participants
 */

const { ValidationError } = require('../../common/errors');

class AddParticipantsDTO {
  constructor(data) {
    // Handle both single participant and array
    if (Array.isArray(data)) {
      this.participants = data;
    } else if (data.participants) {
      this.participants = Array.isArray(data.participants) ? data.participants : [data.participants];
    } else if (data.userId || data.user) {
      // Single participant object
      this.participants = [data];
    } else {
      this.participants = [];
    }

    this.validate();
  }

  validate() {
    if (!Array.isArray(this.participants) || this.participants.length === 0) {
      throw new ValidationError('At least one participant is required');
    }

    this.participants.forEach((participant, index) => {
      const userId = participant.userId || participant.user;
      if (!userId) {
        throw new ValidationError(`Participant at index ${index} must have userId or user`);
      }

      if (participant.role && !['organizer', 'attendee'].includes(participant.role)) {
        throw new ValidationError(`Participant at index ${index} has invalid role`);
      }
    });
  }

  /**
   * Normalize participants to consistent format
   * @returns {Array} Normalized participants
   */
  normalize() {
    return this.participants.map(p => ({
      user: p.userId || p.user,
      role: p.role || 'attendee'
    }));
  }
}

module.exports = AddParticipantsDTO;

