/**
 * Update Friend Settings Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../utils/errors');

class UpdateFriendSettingsUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute update friend settings
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @param {boolean} settings.allowFriendRequests - Allow friend requests
   * @param {string} settings.allowRequestsFrom - 'everyone', 'friends_of_friends', 'nobody'
   * @param {boolean} settings.showInSearch - Show in search
   * @returns {Promise<Object>} Updated settings
   */
  async execute(userId, settings) {
    const { allowFriendRequests, allowRequestsFrom, showInSearch } = settings;

    const updates = {};

    if (allowFriendRequests !== undefined) {
      updates['friendSettings.allowFriendRequests'] = allowFriendRequests;
    }

    if (allowRequestsFrom !== undefined) {
      if (!['everyone', 'friends_of_friends', 'nobody'].includes(allowRequestsFrom)) {
        throw new ValidationError('Invalid allowRequestsFrom value', 400);
      }
      updates['friendSettings.allowRequestsFrom'] = allowRequestsFrom;
    }

    if (showInSearch !== undefined) {
      updates['friendSettings.showInSearch'] = showInSearch;
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one setting must be provided', 400);
    }

    await this.userRepository.update(userId, updates);

    const user = await this.userRepository.findById(userId);
    return { friendSettings: user.friendSettings || {} };
  }
}

module.exports = UpdateFriendSettingsUseCase;


