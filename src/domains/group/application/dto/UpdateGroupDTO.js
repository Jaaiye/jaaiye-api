/**
 * Update Group DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../../shared/domain/errors');

class UpdateGroupDTO {
  constructor(body) {
    this.name = body.name?.trim();
    this.description = body.description?.trim();
    this.settings = body.settings;

    this.validate();
  }

  validate() {
    if (this.name !== undefined) {
      if (!this.name || this.name.length === 0) {
        throw new ValidationError('Group name cannot be empty');
      }
      if (this.name.length > 100) {
        throw new ValidationError('Group name cannot exceed 100 characters');
      }
    }

    if (this.description !== undefined && this.description.length > 500) {
      throw new ValidationError('Description cannot exceed 500 characters');
    }

    if (this.settings) {
      if (this.settings.allowMemberInvites !== undefined && typeof this.settings.allowMemberInvites !== 'boolean') {
        throw new ValidationError('allowMemberInvites must be boolean');
      }
      if (this.settings.allowMemberEventCreation !== undefined && typeof this.settings.allowMemberEventCreation !== 'boolean') {
        throw new ValidationError('allowMemberEventCreation must be boolean');
      }
      if (this.settings.defaultEventParticipation !== undefined && !['auto_add', 'invite_only'].includes(this.settings.defaultEventParticipation)) {
        throw new ValidationError('defaultEventParticipation must be either "auto_add" or "invite_only"');
      }
    }
  }
}

module.exports = UpdateGroupDTO;

