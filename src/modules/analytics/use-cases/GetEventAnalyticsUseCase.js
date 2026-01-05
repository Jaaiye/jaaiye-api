/**
 * Get Event Analytics Use Case
 * Application layer - business logic
 */

class GetEventAnalyticsUseCase {
  constructor({ analyticsService }) {
    this.analyticsService = analyticsService;
  }

  async execute(range) {
    const analytics = await this.analyticsService.getEventAnalytics(range);
    return { analytics };
  }
}

module.exports = GetEventAnalyticsUseCase;

