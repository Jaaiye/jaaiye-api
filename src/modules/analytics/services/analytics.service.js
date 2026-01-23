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

    // Calculate total platform fees
    const totalFees = transactions.reduce((sum, t) => {
      return sum + (Number(t.feeAmount) || 0);
    }, 0);

    // Calculate gross revenue (total including fees)
    const totalGross = totalRevenue + totalFees;

    const transactionCount = transactions.length;

    return {
      totalRevenue, // Net revenue to organizers (excluding platform fee)
      totalFees,    // Platform fees collected
      totalGross,   // Total revenue including fees
      transactionCount,
      averageTransactionAmount: transactionCount > 0 ? totalRevenue / transactionCount : 0,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        baseAmount: t.baseAmount,
        feeAmount: t.feeAmount,
        currency: t.currency,
        provider: t.provider,
        createdAt: t.createdAt
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

    const tickets = await this.ticketRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const totalTickets = tickets.length;
    const usedTickets = tickets.filter(t => t.used).length;
    const cancelledTickets = tickets.filter(t => t.cancelled).length;
    const activeTickets = totalTickets - usedTickets - cancelledTickets;

    return {
      totalTickets,
      usedTickets,
      cancelledTickets,
      activeTickets,
      usageRate: totalTickets > 0 ? (usedTickets / totalTickets) * 100 : 0,
      cancellationRate: totalTickets > 0 ? (cancelledTickets / totalTickets) * 100 : 0
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
    const publicEvents = events.filter(e => e.visibility === 'public').length;
    const privateEvents = totalEvents - publicEvents;

    return {
      totalEvents,
      publicEvents,
      privateEvents,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        visibility: e.visibility,
        createdAt: e.createdAt
      }))
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

    const users = await this.userRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const totalUsers = users.length;
    const verifiedUsers = users.filter(u => u.emailVerified).length;
    const unverifiedUsers = totalUsers - verifiedUsers;

    return {
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0
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

    const notifications = await this.notificationRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    const totalNotifications = notifications.length;
    const readNotifications = notifications.filter(n => n.read).length;
    const unreadNotifications = totalNotifications - readNotifications;

    const groups = await this.groupRepository.find(queryFilters, {
      limit: 10000,
      skip: 0,
      sort: { createdAt: -1 }
    });

    return {
      notifications: {
        total: totalNotifications,
        read: readNotifications,
        unread: unreadNotifications,
        readRate: totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0
      },
      groups: {
        total: groups.length
      }
    };
  }
}

module.exports = AnalyticsService;

