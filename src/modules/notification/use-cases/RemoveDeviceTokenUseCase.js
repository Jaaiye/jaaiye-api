/**
 * Remove Device Token Use Case
 * Application layer - use case
 */

class RemoveDeviceTokenUseCase {
  constructor({ deviceTokenAdapter }) {
    this.deviceTokenAdapter = deviceTokenAdapter;
  }

  async execute(userId, token) {
    await this.deviceTokenAdapter.remove(userId, token);
    return { message: 'Device token removed successfully' };
  }
}

module.exports = RemoveDeviceTokenUseCase;

