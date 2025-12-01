/**
 * Get User Analytics Use Case
 * Application layer - business logic
 */

class GetUserAnalyticsUseCase {
  constructor({ analyticsService }) {
    this.analyticsService = analyticsService;
  }

  async execute(range) {
    const analytics = await this.analyticsService.getUserAnalytics(range);
    return { analytics };
  }
}

module.exports = GetUserAnalyticsUseCase;

