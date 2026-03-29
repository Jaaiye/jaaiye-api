/**
 * Analytics Service
 * Domain service - aggregates analytics data from various repositories
 */

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

  /**
   * Get revenue analytics
   * @param {Object} filters - { startDate, endDate, eventId, groupId }
   * @returns {Promise<Object>}
   */
  async getRevenueAnalytics(filters = {}) {
    const { startDate, endDate, eventId, groupId } = filters;

    const queryFilters = {};
    if (startDate || endDate) {
      queryFilters.createdAt = {};
      if (startDate) queryFilters.createdAt.$gte = new Date(startDate);
      if (endDate) queryFilters.createdAt.$lte = new Date(endDate);
    }
    if (eventId) queryFilters.eventId = eventId;
    if (groupId) queryFilters.groupId = groupId;
    queryFilters.status = 'successful';

    const result = await this.transactionRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const transactions = result.transactions || [];

    // Calculate net revenue (baseAmount - what organizers receive)
    const totalRevenue = transactions.reduce((sum, t) => {
      const revenue = Number(t.baseAmount) || Number(t.amount) || 0;
      return sum + revenue;
    }, 0);

    // Calculate total platform fees collected (10%)
    const totalFees = transactions.reduce((sum, t) => {
      return sum + (Number(t.feeAmount) || 0);
    }, 0);

    // Calculate total gateway fees (what Flutterwave/Paystack charged us)
    const totalGatewayFees = transactions.reduce((sum, t) => {
      return sum + (Number(t.gatewayFee) || 0);
    }, 0);

    // Calculate platform profit (What we charged - What we were charged)
    const platformProfit = totalFees - totalGatewayFees;

    // Calculate gross revenue (total including fees)
    const totalGross = totalRevenue + totalFees;

    const transactionCount = transactions.length;

    // Calculate monthly breakdown for the earnings page
    const monthlyBreakdown = transactions.reduce((acc, t) => {
      const date = new Date(t.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          revenue: 0,
          fees: 0,
          gatewayFees: 0,
          profit: 0,
          count: 0
        };
      }

      const transRevenue = Number(t.baseAmount) || Number(t.amount) || 0;
      const transFees = Number(t.feeAmount) || 0;
      const transGatewayFees = Number(t.gatewayFee) || 0;

      acc[monthKey].revenue += transRevenue;
      acc[monthKey].fees += transFees;
      acc[monthKey].gatewayFees += transGatewayFees;
      acc[monthKey].profit += (transFees - transGatewayFees);
      acc[monthKey].count += 1;

      return acc;
    }, {});

    const breakdownArray = Object.values(monthlyBreakdown).sort((a, b) => a.month.localeCompare(b.month));

    return {
      range: { from: startDate || '', to: endDate || '' },
      totals: {
        totalRevenue,
        totalFees,
        totalGatewayFees,
        platformProfit,
        totalGross,
        transactionCount,
        totalQuantity: transactions.reduce((sum, t) => sum + (Number(t.quantity) || 1), 0),
        averageOrderValue: transactionCount > 0 ? totalGross / transactionCount : 0
      },
      transactionPerformance: {
        totalTransactions: transactionCount,
        successfulTransactions: transactionCount,
        successRate: 100
      },
      monthlyBreakdown: breakdownArray,
      timeline: breakdownArray.map(b => ({
        date: b.month,
        revenue: b.revenue,
        transactions: b.count
      }))
    };
  }


  /**
   * Get ticket analytics
   * @param {Object} filters - { startDate, endDate, eventId }
   * @returns {Promise<Object>}
   */
  async getTicketAnalytics(filters = {}) {
    const { startDate, endDate, eventId } = filters;

    const queryFilters = {};
    if (eventId) queryFilters.eventId = eventId;
    if (startDate || endDate) {
      queryFilters.createdAt = {};
      if (startDate) queryFilters.createdAt.$gte = new Date(startDate);
      if (endDate) queryFilters.createdAt.$lte = new Date(endDate);
    }

    const result = await this.ticketRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const tickets = result.tickets || [];
    const totalTickets = tickets.length;

    const usedTickets = tickets.filter(t => t.status === 'used' || t.usedAt).length;
    const cancelledTickets = tickets.filter(t => t.status === 'cancelled').length;
    const activeTickets = totalTickets - usedTickets - cancelledTickets;
    const totalRevenue = tickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

    return {
      range: { from: startDate || '', to: endDate || '' },
      summary: {
        tickets: totalTickets,
        revenue: totalRevenue,
        orders: totalTickets, // Simplification
        avgPrice: totalTickets > 0 ? totalRevenue / totalTickets : 0
      },
      statusBreakdown: [
        { status: 'used', tickets: usedTickets, orders: 0, revenue: 0 },
        { status: 'active', tickets: activeTickets, orders: 0, revenue: 0 },
        { status: 'cancelled', tickets: cancelledTickets, orders: 0, revenue: 0 }
      ],
      topEvents: []
    };
  }


  /**
   * Get event analytics
   * @param {Object} filters - { startDate, endDate, creatorId }
   * @returns {Promise<Object>}
   */
  async getEventAnalytics(filters = {}) {
    const { startDate, endDate, creatorId } = filters;

    const queryFilters = {};
    if (creatorId) queryFilters.creatorId = creatorId;
    if (startDate || endDate) {
      queryFilters.createdAt = {};
      if (startDate) queryFilters.createdAt.$gte = new Date(startDate);
      if (endDate) queryFilters.createdAt.$lte = new Date(endDate);
    }

    const result = await this.eventRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const events = result.events || [];
    const totalEvents = events.length;
    const publicEvents = events.filter(e => e.privacy === 'public').length;
    const privateEvents = totalEvents - publicEvents;

    return {
      range: { from: startDate || '', to: endDate || '' },
      statusCounts: [
        { status: 'public', count: publicEvents },
        { status: 'private', count: privateEvents }
      ],
      upcomingEvents: events.filter(e => new Date(e.startTime) > new Date()).length,
      categoryMix: [],
      topRevenueEvents: []
    };
  }



  /**
   * Get user analytics
   * @param {Object} filters - { startDate, endDate }
   * @returns {Promise<Object>}
   */
  async getUserAnalytics(filters = {}) {
    const { startDate, endDate } = filters;

    const queryFilters = {};
    if (startDate || endDate) {
      queryFilters.createdAt = {};
      if (startDate) queryFilters.createdAt.$gte = new Date(startDate);
      if (endDate) queryFilters.createdAt.$lte = new Date(endDate);
    }

    const result = await this.userRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const users = result.users || [];
    const totalUsers = users.length;

    const verifiedUsers = users.filter(u => u.emailVerified).length;
    const activeUsers = users.filter(u => u.isActive).length;

    return {
      range: { from: startDate || '', to: endDate || '' },
      totals: {
        totalUsers,
        verifiedUsers,
        activeUsers,
        providerLinks: {
          google: users.filter(u => u.googleCalendar?.googleId).length,
          apple: users.filter(u => u.appleId).length
        }
      },
      growthTimeline: []
    };
  }


  /**
   * Get engagement analytics
   * @param {Object} filters - { startDate, endDate }
   * @returns {Promise<Object>}
   */
  async getEngagementAnalytics(filters = {}) {
    const { startDate, endDate } = filters;

    const queryFilters = {};
    if (startDate || endDate) {
      queryFilters.createdAt = {};
      if (startDate) queryFilters.createdAt.$gte = new Date(startDate);
      if (endDate) queryFilters.createdAt.$lte = new Date(endDate);
    }

    const notificationResult = await this.notificationRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const notifications = notificationResult.notifications || [];
    const totalNotifications = notifications.length;

    const readNotifications = notifications.filter(n => n.read).length;
    const unreadNotifications = totalNotifications - readNotifications;

    const groupResult = await this.groupRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const groups = groupResult.groups || [];

    return {
      range: { from: startDate || '', to: endDate || '' },
      groupMetrics: {
        totalGroups: groups.length,
        activeGroups: groups.filter(g => g.isActive).length,
        totalMembers: groups.reduce((sum, g) => sum + (g.members?.length || 0), 0),
        averageMembers: groups.length > 0 ? groups.reduce((sum, g) => sum + (g.members?.length || 0), 0) / groups.length : 0
      },
      notificationMetrics: {
        totalNotifications: totalNotifications,
        readNotifications: readNotifications,
        readRate: totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0
      }
    };
  }

}

module.exports = AnalyticsService;
