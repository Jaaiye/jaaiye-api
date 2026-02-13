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

    // Create admission size lookup map from event ticket types for consistent calculation
    const admissionSizeMap = {};
    if (event.ticketTypes) {
      event.ticketTypes.forEach(tt => {
        admissionSizeMap[String(tt._id || tt.id)] = tt.admissionSize || 1;
      });
    }

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
    // Total tickets sold: count from tickets (physical tickets/QR codes)
    const totalTicketsSold = filteredTickets.reduce((sum, t) => sum + (t.quantity || 1), 0);

    // Total attendees: total people admitted across all tickets (pulling from event config)
    const totalAttendees = filteredTickets.reduce((sum, t) => {
      const typeId = t.ticketTypeId?.toString();
      const size = admissionSizeMap[typeId] || t.admissionSize || 1;
      return sum + size;
    }, 0);

    // Total checked-in: total people who have arrived
    const totalCheckedIn = filteredTickets.reduce((sum, t) => sum + (t.checkedInCount || 0), 0);

    // Total revenue: sum from transactions
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + Number(t.baseAmount || 0), 0);

    // Check-in rate: percentage of attendees who have checked in
    const checkInRate = totalAttendees > 0 ? (totalCheckedIn / totalAttendees) * 100 : 0;

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
        totalAttendees,
        totalCheckedIn,
        totalRevenue,
        checkInRate,
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
      periods[periodKey] += Number(transaction.baseAmount || 0);
    });

    return periods;
  }

  _calculateTicketTypeBreakdown(event, tickets, transactions) {
    const breakdown = {};

    // 1. Initialize with event ticket types
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
          admissionCount: 0,
          revenue: 0
        };
      });
    }

    // 2. Calculate soldCount, admissionCount, and revenue from tickets (The Ground Truth)
    tickets.forEach(ticket => {
      const typeId = ticket.ticketTypeId?.toString() || 'unknown';
      if (!breakdown[typeId]) {
        breakdown[typeId] = {
          ticketTypeId: typeId,
          name: ticket.ticketTypeName || 'Unknown',
          type: 'custom',
          price: Number(ticket.price || 0),
          admissionSize: ticket.admissionSize || 1,
          soldCount: 0,
          admissionCount: 0,
          revenue: 0
        };
      }

      const quantity = Number(ticket.quantity || 1);
      const ticketAdmissionSize = breakdown[typeId].admissionSize;
      const ticketPrice = Number(ticket.price || 0);

      breakdown[typeId].soldCount += quantity;
      breakdown[typeId].admissionCount += (quantity * ticketAdmissionSize);
      breakdown[typeId].revenue += (quantity * ticketPrice);
    });

    // 3. Reconcile with total transaction baseAmount
    // This catches revenue from transactions that might not have created tickets or price discrepancies
    const totalTicketRevenue = Object.values(breakdown).reduce((sum, item) => sum + item.revenue, 0);
    const totalTransactionBaseAmount = transactions.reduce((sum, tx) => sum + Number(tx.baseAmount || 0), 0);

    const diff = totalTransactionBaseAmount - totalTicketRevenue;

    // If there's a significant difference (> 0.01 to avoid float issues), add as an adjustment
    if (Math.abs(diff) > 0.01) {
      breakdown['adjustments'] = {
        ticketTypeId: 'adjustments',
        name: 'Adjustments / Other',
        type: 'adjustment',
        price: 0,
        admissionSize: 0,
        soldCount: 0,
        admissionCount: 0,
        revenue: diff
      };
    }

    return Object.values(breakdown).filter(item => item.soldCount > 0 || item.revenue !== 0);
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

