/**
 * Get Log Stats Use Case
 */
const SystemLog = require('../../common/entities/SystemLog.schema');

class GetLogStatsUseCase {
    async execute() {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Aggregation for levels in last 24h
        const levelStats = await SystemLog.aggregate([
            { $match: { timestamp: { $gte: last24h } } },
            { $group: { _id: '$level', count: { $sum: 1 } } }
        ]);

        // Aggregation for environment split
        const envStats = await SystemLog.aggregate([
            { $match: { timestamp: { $gte: last24h } } },
            { $group: { _id: '$environment', count: { $sum: 1 } } }
        ]);

        // Hourly trend for the last 24h
        const hourlyTrend = await SystemLog.aggregate([
            { $match: { timestamp: { $gte: last24h }, level: 'error' } },
            {
                $group: {
                    _id: {
                        hour: { $hour: { date: '$timestamp', timezone: 'Africa/Lagos' } },
                        day: { $dayOfMonth: { date: '$timestamp', timezone: 'Africa/Lagos' } }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.day': 1, '_id.hour': 1 } }
        ]);

        return {
            last24h: {
                levels: levelStats.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, { error: 0, warn: 0, info: 0 }),
                environments: envStats.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {}),
                hourlyErrorTrend: hourlyTrend.map(t => ({
                    time: `${t._id.hour}:00`,
                    count: t.count
                }))
            }
        };
    }
}

module.exports = GetLogStatsUseCase;
