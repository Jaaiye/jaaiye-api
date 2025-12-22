/**
 * Respond to Friend Request DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class RespondToFriendRequestDTO {
  constructor(data) {
    this.action = data.action;

    this.validate();
  }

  validate() {
    if (!this.action) {
      throw new ValidationError('Action is required');
    }

    if (!['accept', 'decline'].includes(this.action)) {
      throw new ValidationError('Action must be either "accept" or "decline"');
    }
  }
}

module.exports = RespondToFriendRequestDTO;


