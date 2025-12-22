/**
 * Get Revenue Analytics Use Case
 * Application layer - business logic
 */

class GetRevenueAnalyticsUseCase {
  constructor({ analyticsService }) {
    this.analyticsService = analyticsService;
  }

  async execute(range) {
    const analytics = await this.analyticsService.getRevenueAnalytics(range);
    return { analytics };
  }
}

module.exports = GetRevenueAnalyticsUseCase;

