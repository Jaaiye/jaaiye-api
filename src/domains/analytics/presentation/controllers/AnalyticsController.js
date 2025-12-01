/**
 * Analytics Controller
 * Presentation layer - HTTP request handler
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');
const {
  GetRevenueAnalyticsUseCase,
  GetTicketAnalyticsUseCase,
  GetEventAnalyticsUseCase,
  GetUserAnalyticsUseCase,
  GetEngagementAnalyticsUseCase
} = require('../../application/use-cases');

function extractRange(query) {
  return {
    from: query.from,
    to: query.to,
  };
}

class AnalyticsController {
  constructor({
    getRevenueAnalyticsUseCase,
    getTicketAnalyticsUseCase,
    getEventAnalyticsUseCase,
    getUserAnalyticsUseCase,
    getEngagementAnalyticsUseCase
  }) {
    this.revenue = asyncHandler(async (req, res) => {
      const range = extractRange(req.query);
      const result = await getRevenueAnalyticsUseCase.execute(range);
      return successResponse(res, result);
    });

    this.tickets = asyncHandler(async (req, res) => {
      const range = extractRange(req.query);
      const result = await getTicketAnalyticsUseCase.execute(range);
      return successResponse(res, result);
    });

    this.events = asyncHandler(async (req, res) => {
      const range = extractRange(req.query);
      const result = await getEventAnalyticsUseCase.execute(range);
      return successResponse(res, result);
    });

    this.users = asyncHandler(async (req, res) => {
      const range = extractRange(req.query);
      const result = await getUserAnalyticsUseCase.execute(range);
      return successResponse(res, result);
    });

    this.engagement = asyncHandler(async (req, res) => {
      const range = extractRange(req.query);
      const result = await getEngagementAnalyticsUseCase.execute(range);
      return successResponse(res, result);
    });
  }
}

module.exports = AnalyticsController;


