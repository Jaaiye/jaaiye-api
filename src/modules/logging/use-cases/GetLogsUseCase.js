/**
 * Get Logs Use Case
 */
const SystemLog = require('../../common/entities/SystemLog.schema');

class GetLogsUseCase {
    async execute({ level, search, environment, traceId, userId, page = 1, limit = 50 }) {
        const query = {};

        if (level) query.level = level;
        if (environment) query.environment = environment;
        if (traceId) query.traceId = traceId;
        if (userId) query['context.userId'] = userId;

        if (search) {
            // Search in message or traceId
            query.$or = [
                { message: { $regex: search, $options: 'i' } },
                { traceId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            SystemLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            SystemLog.countDocuments(query)
        ]);

        return {
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }
}

module.exports = GetLogsUseCase;
