/**
 * Register Device Token Use Case
 * Application layer - use case
 */

class RegisterDeviceTokenUseCase {
  constructor({ deviceTokenAdapter }) {
    this.deviceTokenAdapter = deviceTokenAdapter;
  }

  async execute(userId, token, platform) {
    await this.deviceTokenAdapter.save(userId, token, platform);
    return { message: 'Device token registered successfully' };
  }
}

module.exports = RegisterDeviceTokenUseCase;

