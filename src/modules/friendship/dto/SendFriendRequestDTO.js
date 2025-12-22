/**
 * Send Friend Request DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class SendFriendRequestDTO {
  constructor(data) {
    this.recipientId = data.recipientId;
    this.message = data.message;

    this.validate();
  }

  validate() {
    if (!this.recipientId) {
      throw new ValidationError('Recipient ID is required');
    }

    if (this.message && this.message.length > 200) {
      throw new ValidationError('Message cannot exceed 200 characters');
    }
  }
}

module.exports = SendFriendRequestDTO;


