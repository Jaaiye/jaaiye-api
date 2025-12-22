/**
 * Update Friend Settings DTO
 * Application layer - data transfer object
 */

const { ValidationError } = require('../../common/errors');

class UpdateFriendSettingsDTO {
  constructor(data) {
    this.allowFriendRequests = data.allowFriendRequests;
    this.allowRequestsFrom = data.allowRequestsFrom;
    this.showInSearch = data.showInSearch;

    this.validate();
  }

  validate() {
    if (this.allowFriendRequests !== undefined && typeof this.allowFriendRequests !== 'boolean') {
      throw new ValidationError('allowFriendRequests must be boolean');
    }

    if (this.allowRequestsFrom !== undefined) {
      if (!['everyone', 'friends_of_friends', 'nobody'].includes(this.allowRequestsFrom)) {
        throw new ValidationError('Invalid allowRequestsFrom value');
      }
    }

    if (this.showInSearch !== undefined && typeof this.showInSearch !== 'boolean') {
      throw new ValidationError('showInSearch must be boolean');
    }
  }
}

module.exports = UpdateFriendSettingsDTO;


