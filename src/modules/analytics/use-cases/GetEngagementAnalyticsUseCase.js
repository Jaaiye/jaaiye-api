/**
 * Get Engagement Analytics Use Case
 * Application layer - business logic
 */

class GetEngagementAnalyticsUseCase {
  constructor({ analyticsService }) {
    this.analyticsService = analyticsService;
  }

  async execute(range) {
    const analytics = await this.analyticsService.getEngagementAnalytics(range);
    return { analytics };
  }
}

module.exports = GetEngagementAnalyticsUseCase;

