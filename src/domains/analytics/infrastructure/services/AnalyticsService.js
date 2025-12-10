/**
 * Analytics Service
 * Infrastructure layer - aggregates analytics data from repositories
 */

// Repositories are injected via constructor, not imported

const SUCCESS_STATUSES = ['successful', 'completed'];

function toDate(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeRange(input = {}) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = toDate(input.from, defaultFrom);
  const to = toDate(input.to, now);
  return { from, to };
}

function buildDateMatch(range, field = 'createdAt') {
  return {
    [field]: {
      $gte: range.from,
      $lte: range.to,
    },
  };
}

class AnalyticsService {
  constructor({
    transactionRepository,
    ticketRepository,
    eventRepository,
    userRepository,
    notificationRepository,
    groupRepository
  }) {
    this.transactionRepository = transactionRepository;
    this.ticketRepository = ticketRepository;
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.groupRepository = groupRepository;
  }

  async getRevenueAnalytics(rangeInput) {
    const range = normalizeRange(rangeInput);
    const TransactionSchema = require('../../../payment/infrastructure/persistence/schemas/Transaction.schema');

    const match = {
      ...buildDateMatch(range),
      status: { $in: SUCCESS_STATUSES },
    };

    const [summary] = await TransactionSchema.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const totals = summary || {
      totalRevenue: 0,
      transactionCount: 0,
      totalQuantity: 0,
    };

    const ratesResult = await TransactionSchema.aggregate([
      { $match: buildDateMatch(range) },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const rates = Array.isArray(ratesResult) ? ratesResult : [];
    const total = rates.reduce((sum, item) => sum + item.count, 0);
    const success = rates
      .filter((item) => SUCCESS_STATUSES.includes(item._id))
      .reduce((sum, item) => sum + item.count, 0);

    const providerBreakdown = await TransactionSchema.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$provider',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const timeline = await TransactionSchema.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const averageOrderValue =
      totals.transactionCount === 0
        ? 0
        : totals.totalRevenue / totals.transactionCount;

    return {
      range,
      totals: {
        totalRevenue: totals.totalRevenue,
        transactionCount: totals.transactionCount,
        totalQuantity: totals.totalQuantity,
        averageOrderValue,
      },
      transactionPerformance: {
        totalTransactions: total,
        successfulTransactions: success,
        successRate: total === 0 ? 0 : success / total,
      },
      providerBreakdown: providerBreakdown.map((entry) => ({
        provider: entry._id,
        revenue: entry.revenue,
        transactions: entry.transactions,
      })),
      timeline: timeline.map((point) => ({
        date: point._id,
        revenue: point.revenue,
        transactions: point.transactions,
      })),
    };
  }

  async getTicketAnalytics(rangeInput) {
    const range = normalizeRange(rangeInput);
    const TicketSchema = require('../../../ticket/infrastructure/persistence/schemas/Ticket.schema');

    const statuses = await TicketSchema.aggregate([
      { $match: buildDateMatch(range) },
      {
        $group: {
          _id: '$status',
          tickets: { $sum: '$quantity' },
          orders: { $sum: 1 },
          revenue: { $sum: { $multiply: ['$price', '$quantity'] } },
        },
      },
    ]);

    const [result] = await TicketSchema.aggregate([
      { $match: buildDateMatch(range) },
      {
        $group: {
          _id: null,
          tickets: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$price', '$quantity'] } },
          orders: { $sum: 1 },
        },
      },
    ]);

    const topEvents = await TicketSchema.aggregate([
      { $match: buildDateMatch(range) },
      {
        $group: {
          _id: '$eventId',
          tickets: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$price', '$quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    const eventIds = topEvents.map((item) => item._id);
    const events = await this.eventRepository.find({ id: { $in: eventIds } }, { limit: 5 });
    const eventMap = new Map(events.events.map((event) => [event.id, event]));

    return {
      range,
      summary: result ? {
        tickets: result.tickets,
        revenue: result.revenue,
        orders: result.orders,
        avgPrice: result.tickets === 0 ? 0 : result.revenue / result.tickets,
      } : { tickets: 0, revenue: 0, orders: 0, avgPrice: 0 },
      statusBreakdown: statuses.map((entry) => ({
        status: entry._id,
        tickets: entry.tickets,
        orders: entry.orders,
        revenue: entry.revenue,
      })),
      topEvents: topEvents.map((item) => {
        const event = eventMap.get(String(item._id));
        return {
          eventId: item._id,
          title: event?.title || 'Unknown Event',
          startTime: event?.startTime || null,
          venue: event?.venue || null,
          tickets: item.tickets,
          revenue: item.revenue,
        };
      }),
    };
  }

  async getEventAnalytics(rangeInput) {
    const range = normalizeRange(rangeInput);
    const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');
    const TransactionSchema = require('../../../payment/infrastructure/persistence/schemas/Transaction.schema');

    // Get status counts - use a wider date range or all events if range is too restrictive
    // For admin dashboard, we want to see all events, not just recent ones
    const statusCounts = await EventSchema.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const now = new Date();
    const futureMatch = {
      startTime: { $gte: now },
      ...buildDateMatch(range, 'startTime'),
    };
    const upcomingEvents = await EventSchema.countDocuments(futureMatch);

    // Get category mix - show all categories for admin dashboard
    const categoryMix = await EventSchema.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const topEvents = await TransactionSchema.aggregate([
      {
        $match: {
          ...buildDateMatch(range),
          status: { $in: SUCCESS_STATUSES },
        }
      },
      {
        $group: {
          _id: '$eventId',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    // Convert eventIds to strings for lookup
    const eventIds = topEvents.map((item) => String(item._id));
    const mongoose = require('mongoose');

    // Try to find events by both string ID and ObjectId
    const objectIds = eventIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    // Use the EventSchema directly for better ID matching (already declared above)
    const eventDocs = await EventSchema.find({ _id: { $in: objectIds } }).lean();

    // Create a map with both string and ObjectId keys for lookup
    const eventMap = new Map();
    eventDocs.forEach((doc) => {
      const idStr = String(doc._id);
      eventMap.set(idStr, doc);
      // Also add ObjectId version if different
      if (doc._id.toString() !== idStr) {
        eventMap.set(doc._id.toString(), doc);
      }
    });

    return {
      range,
      statusCounts: statusCounts.map((entry) => ({
        status: entry._id || 'unknown',
        count: entry.count || 0,
      })),
      upcomingEvents,
      categoryMix: categoryMix.map((entry) => ({
        category: entry._id || 'unknown',
        count: entry.count || 0,
      })),
      topRevenueEvents: topEvents.map((item) => {
        const eventIdStr = String(item._id);
        const event = eventMap.get(eventIdStr) || eventMap.get(item._id);
        return {
          eventId: eventIdStr,
          title: event?.title || 'Unknown Event',
          startTime: event?.startTime || null,
          revenue: item.revenue || 0,
          transactions: item.transactions || 0,
        };
      }),
    };
  }

  async getUserAnalytics(rangeInput) {
    const range = normalizeRange(rangeInput);
    const UserSchema = require('../../../shared/infrastructure/persistence/schemas/User.schema');

    const growthTimeline = await UserSchema.aggregate([
      { $match: buildDateMatch(range, 'createdAt') },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          registrations: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalUsers = await UserSchema.countDocuments(buildDateMatch(range, 'createdAt'));
    const verifiedUsers = await UserSchema.countDocuments({
      ...buildDateMatch(range, 'createdAt'),
      emailVerified: true,
    });

    const activeSince = new Date();
    activeSince.setDate(activeSince.getDate() - 30);
    const activeUsers = await UserSchema.countDocuments({
      lastLogin: { $gte: activeSince },
    });

    const [providerLinks] = await UserSchema.aggregate([
      { $match: buildDateMatch(range, 'createdAt') },
      {
        $group: {
          _id: null,
          google: {
            $sum: { $cond: ['$providerLinks.google', 1, 0] },
          },
          apple: {
            $sum: { $cond: ['$providerLinks.apple', 1, 0] },
          },
        },
      },
    ]);

    return {
      range,
      totals: {
        totalUsers,
        verifiedUsers,
        activeUsers,
        providerLinks: providerLinks || { google: 0, apple: 0 },
      },
      growthTimeline: growthTimeline.map((point) => ({
        date: point._id,
        registrations: point.registrations,
      })),
    };
  }

  async getEngagementAnalytics(rangeInput) {
    const range = normalizeRange(rangeInput);
    const GroupSchema = require('../../../group/infrastructure/persistence/schemas/Group.schema');
    const NotificationSchema = require('../../../notification/infrastructure/persistence/schemas/Notification.schema');

    const totalGroups = await GroupSchema.countDocuments(buildDateMatch(range, 'createdAt'));
    const activeGroups = await GroupSchema.countDocuments({
      ...buildDateMatch(range, 'createdAt'),
      isActive: true,
    });

    const [memberAggregates] = await GroupSchema.aggregate([
      { $match: buildDateMatch(range, 'createdAt') },
      {
        $project: {
          memberCount: { $size: '$members' },
        },
      },
      {
        $group: {
          _id: null,
          totalMembers: { $sum: '$memberCount' },
          averageMembers: { $avg: '$memberCount' },
        },
      },
    ]);

    const totals = await NotificationSchema.aggregate([
      { $match: buildDateMatch(range) },
      {
        $group: {
          _id: '$read',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = totals.reduce((sum, entry) => sum + entry.count, 0);
    const read = totals
      .filter((entry) => entry._id === true)
      .reduce((sum, entry) => sum + entry.count, 0);

    return {
      range,
      groupMetrics: {
        totalGroups,
        activeGroups,
        totalMembers: memberAggregates?.totalMembers || 0,
        averageMembers: memberAggregates?.averageMembers || 0,
      },
      notificationMetrics: {
        totalNotifications: total,
        readNotifications: read,
        readRate: total === 0 ? 0 : read / total,
      },
    };
  }
}

module.exports = AnalyticsService;

