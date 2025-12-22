/**
 * Device Token Adapter
 * Infrastructure layer - external services
 * Manages device tokens using UserRepository
 */

const UserSchema = require('../../common/entities/User.schema');

class DeviceTokenAdapter {
  /**
   * Save device token
   * @param {string} userId - User ID
   * @param {string} token - Device token
   * @param {string} platform - Platform (ios, android, web)
   * @returns {Promise<void>}
   */
  async save(userId, token, platform = 'web') {
    if (!userId || !token) {
      throw new Error('User ID and token are required');
    }

    const tokenData = {
      token,
      platform,
      createdAt: new Date()
    };

    const result = await UserSchema.updateOne(
      { _id: userId },
      {
        $addToSet: {
          deviceTokens: tokenData
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Remove device token
   * @param {string} userId - User ID
   * @param {string} token - Device token
   * @returns {Promise<void>}
   */
  async remove(userId, token) {
    if (!userId || !token) {
      throw new Error('User ID and token are required');
    }

    const result = await UserSchema.updateOne(
      { _id: userId },
      { $pull: { deviceTokens: { token } } }
    );

    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Get user device tokens
   * @param {string} userId - User ID
   * @returns {Promise<string[]>} Array of device tokens
   */
  async getUserDeviceTokens(userId) {
    const user = await UserSchema.findById(userId).select('deviceTokens');
    if (!user) {
      throw new Error('User not found');
    }

    return user.deviceTokens?.map(dt => dt.token) || [];
  }

  /**
   * Remove failed tokens
   * @param {string} userId - User ID
   * @param {string[]} failedTokens - Array of failed token strings
   * @returns {Promise<void>}
   */
  async removeFailedTokens(userId, failedTokens) {
    if (!failedTokens || failedTokens.length === 0) {
      return;
    }

    await UserSchema.updateOne(
      { _id: userId },
      { $pull: { deviceTokens: { token: { $in: failedTokens } } } }
    );
  }
}

module.exports = DeviceTokenAdapter;

