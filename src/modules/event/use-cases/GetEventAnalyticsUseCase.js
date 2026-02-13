/**
 * Get Event Analytics Use Case
 * Application layer - get analytics for a specific event
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');

class GetEventAnalyticsUseCase {
  constructor({ eventRepository, ticketRepository, transactionRepository, eventTeamRepository }) {
    this.eventRepository = eventRepository;
    this.ticketRepository = ticketRepository;
    this.transactionRepository = transactionRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  async execute(eventId, userId, { startDate, endDate, groupBy = 'day' }) {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    // Check permissions: creator, co-organizer, or admin can view analytics
    let hasAccess = false;
    if (event.origin === 'jaaiye') {
      // For platform events, check if user is admin (would need user role check)
      // For now, allow if user is creator
      hasAccess = true; // Will be checked by admin middleware in controller
    } else if (event.creatorId && String(event.creatorId) === String(userId)) {
      hasAccess = true;
    } else {
      // Check if user is a co-organizer
      const teamMember = await this.eventTeamRepository.findByEventAndUser(event._id || event.id, userId);
      if (teamMember && teamMember.role === 'co_organizer' && teamMember.status === 'accepted') {
        hasAccess = teamMember.canPerform('viewAnalytics');
      }
    }

    if (!hasAccess) {
      throw new EventAccessDeniedError('You do not have permission to view analytics for this event');
    }

    // Get all tickets for this event (for counting)
    const allTickets = await this.ticketRepository.findByEvent(event._id || event.id);

    // Get all transactions for this event (for revenue calculations)
    const allTransactions = await this.transactionRepository.findByEvent(event._id || event.id);
    const successfulTransactions = allTransactions.filter(t => t.status === 'successful');

    // Parse date range
    const start = startDate ? new Date(startDate) : new Date(event.createdAt);
    const end = endDate ? new Date(endDate) : new Date();

    // Filter tickets by date range (only active/used tickets, exclude cancelled)
    const filteredTickets = allTickets.filter(t => {
      const ticketDate = new Date(t.createdAt);
      return ticketDate >= start && ticketDate <= end && t.status !== 'cancelled';
    });

    // Filter transactions by date range
    const filteredTransactions = successfulTransactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= start && transactionDate <= end;
    });

    // Group by time period (using tickets for counts)
    const salesByPeriod = this._groupByPeriod(filteredTickets, groupBy, start, end);

    // Calculate revenue by period (using transactions)
    const revenueByPeriod = this._calculateRevenueByPeriod(filteredTransactions, groupBy, start, end);

    // Ticket type breakdown (soldCount from tickets, revenue from transactions)
    const ticketTypeBreakdown = this._calculateTicketTypeBreakdown(event, filteredTickets, filteredTransactions);

    // Overall metrics
    // Total tickets sold: count from tickets
    const totalTicketsSold = filteredTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

    // Total revenue: sum from transactions
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Average ticket price: revenue / tickets sold
    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    // Conversion metrics (if we had view data, but for now just ticket sales)
    const conversionRate = 0; // Would need view/impression data

    return {
      event: {
        id: event._id || event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime
      },
      period: {
        startDate: start,
        endDate: end,
        groupBy
      },
      metrics: {
        totalTicketsSold,
        totalRevenue,
        averageTicketPrice,
        conversionRate
      },
      salesByPeriod,
      revenueByPeriod,
      ticketTypeBreakdown
    };
  }

  _groupByPeriod(tickets, groupBy, start, end) {
    const periods = {};

    tickets.forEach(ticket => {
      const date = new Date(ticket.createdAt);
      let periodKey;

      if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const week = this._getWeek(date);
        periodKey = `${date.getFullYear()}-W${week}`;
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!periods[periodKey]) {
        periods[periodKey] = 0;
      }
      periods[periodKey] += ticket.quantity || 1;
    });

    return periods;
  }

  _calculateRevenueByPeriod(transactions, groupBy, start, end) {
    const periods = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt);
      let periodKey;

      if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const week = this._getWeek(date);
        periodKey = `${date.getFullYear()}-W${week}`;
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!periods[periodKey]) {
        periods[periodKey] = 0;
      }
      // Sum transaction amounts (transactions have amount field)
      periods[periodKey] += Number(transaction.amount || 0);
    });

    return periods;
  }

  _calculateTicketTypeBreakdown(event, tickets, transactions) {
    const breakdown = {};

    // Initialize with event ticket types
    if (event.ticketTypes && event.ticketTypes.length > 0) {
      event.ticketTypes.forEach(tt => {
        const id = tt._id?.toString() || tt.id;
        breakdown[id] = {
          ticketTypeId: id,
          name: tt.name,
          type: tt.type,
          price: Number(tt.price || 0),
          admissionSize: tt.admissionSize || 1,
          soldCount: 0,
          revenue: 0
        };
      });
    }

    // 1. Calculate soldCount from tickets (Source of truth for ticket volume)
    tickets.forEach(ticket => {
      const typeId = ticket.ticketTypeId?.toString() || 'unknown';
      if (!breakdown[typeId]) {
        breakdown[typeId] = {
          ticketTypeId: typeId,
          name: ticket.ticketTypeName || 'Unknown',
          type: 'custom',
          price: Number(ticket.price || 0),
          soldCount: 0,
          revenue: 0
        };
      }

      const quantity = Number(ticket.quantity || 1);
      breakdown[typeId].soldCount += quantity;
    });

    // 2. Calculate revenue from transactions (Source of truth for money)
    // Map transaction ID to its ticket type(s)
    const transactionTypeMap = {};
    tickets.forEach(ticket => {
      if (ticket.transactionId) {
        const txId = ticket.transactionId.toString();
        const typeId = ticket.ticketTypeId?.toString() || 'unknown';
        if (!transactionTypeMap[txId]) {
          transactionTypeMap[txId] = new Set();
        }
        transactionTypeMap[txId].add(typeId);
      }
    });

    transactions.forEach(transaction => {
      const txId = transaction._id?.toString() || transaction.id;
      let targetTypeIds = [];

      // Priority 1: Use the ticketTypeId stored directly on the transaction
      if (transaction.ticketTypeId) {
        targetTypeIds = [transaction.ticketTypeId.toString()];
      }
      // Priority 2: Use the types of the tickets created by this transaction
      else if (transactionTypeMap[txId]) {
        targetTypeIds = Array.from(transactionTypeMap[txId]);
      }
      // Priority 3: Fallback to unknown
      else {
        targetTypeIds = ['unknown'];
      }

      // Distribute transaction amount among found types
      const amountPerType = Number(transaction.amount || 0) / targetTypeIds.length;
      targetTypeIds.forEach(typeId => {
        if (!breakdown[typeId]) {
          breakdown[typeId] = {
            ticketTypeId: typeId,
            name: 'Unknown',
            type: 'custom',
            price: amountPerType,
            soldCount: 0,
            revenue: 0
          };
        }
        breakdown[typeId].revenue += amountPerType;
      });
    });

    return Object.values(breakdown);
  }

  _getWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
}

module.exports = GetEventAnalyticsUseCase;

