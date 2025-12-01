/**
 * Update Calendar DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../../shared/domain/errors');

class UpdateCalendarDTO {
  constructor(data) {
    this.name = data.name;
    this.description = data.description;
    this.color = data.color;
    this.isPublic = data.isPublic;

    this.validate();
  }

  validate() {
    if (this.name !== undefined && typeof this.name !== 'string') {
      throw new ValidationError('Name must be a string');
    }

    if (this.description !== undefined && typeof this.description !== 'string') {
      throw new ValidationError('Description must be a string');
    }

    if (this.color !== undefined && typeof this.color !== 'string') {
      throw new ValidationError('Color must be a string');
    }

    if (this.isPublic !== undefined && typeof this.isPublic !== 'boolean') {
      throw new ValidationError('isPublic must be a boolean');
    }
  }
}

module.exports = UpdateCalendarDTO;

