/**
 * Get Ticket Analytics Use Case
 * Application layer - business logic
 */

class GetTicketAnalyticsUseCase {
  constructor({ analyticsService }) {
    this.analyticsService = analyticsService;
  }

  async execute(range) {
    const analytics = await this.analyticsService.getTicketAnalytics(range);
    return { analytics };
  }
}

module.exports = GetTicketAnalyticsUseCase;

