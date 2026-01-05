/**
 * Create Group DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class CreateGroupDTO {
  constructor(body) {
    this.name = body.name?.trim();
    this.description = body.description?.trim();
    this.memberIds = Array.isArray(body.memberIds) ? body.memberIds : [];

    this.validate();
  }

  validate() {
    if (!this.name || this.name.length === 0) {
      throw new ValidationError('Group name is required');
    }

    if (this.name.length > 100) {
      throw new ValidationError('Group name cannot exceed 100 characters');
    }

    if (this.description && this.description.length > 500) {
      throw new ValidationError('Description cannot exceed 500 characters');
    }
  }
}

module.exports = CreateGroupDTO;

