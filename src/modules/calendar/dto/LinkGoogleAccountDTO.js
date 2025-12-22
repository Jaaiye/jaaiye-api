/**
 * Link Google Account DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class LinkGoogleAccountDTO {
  constructor(data) {
    this.serverAuthCode = data.serverAuthCode;

    this.validate();
  }

  validate() {
    if (!this.serverAuthCode || typeof this.serverAuthCode !== 'string') {
      throw new ValidationError('serverAuthCode is required');
    }
  }
}

module.exports = LinkGoogleAccountDTO;

