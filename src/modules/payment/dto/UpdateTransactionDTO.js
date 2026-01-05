/**
 * Update Transaction DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class UpdateTransactionDTO {
  constructor(data) {
    this.reference = data.reference;
    this.transId = data.transId;
    this.transReference = data.transReference;
    this.status = data.status || 'pending';
  }

  validate() {
    if (!this.reference) {
      throw new ValidationError('Missing required field: reference is required');
    }
  }
}

module.exports = UpdateTransactionDTO;

