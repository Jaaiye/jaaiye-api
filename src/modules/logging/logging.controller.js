/**
 * Logging Controller
 */
const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');

class LoggingController {
    constructor({ getLogsUseCase, getLogStatsUseCase }) {
        this.getLogs = asyncHandler(async (req, res) => {
            const { level, search, environment, traceId, userId, page, limit } = req.query;
            const result = await getLogsUseCase.execute({
                level, search, environment, traceId, userId, page, limit
            });
            return successResponse(res, result);
        });

        this.getStats = asyncHandler(async (req, res) => {
            const result = await getLogStatsUseCase.execute();
            return successResponse(res, result);
        });

        this.getTrace = asyncHandler(async (req, res) => {
            const { traceId } = req.params;
            const result = await getLogsUseCase.execute({ traceId, limit: 100 });
            return successResponse(res, result);
        });
    }
}

module.exports = LoggingController;
