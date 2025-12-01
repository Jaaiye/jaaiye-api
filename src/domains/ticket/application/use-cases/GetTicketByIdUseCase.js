/**
 * Get Ticket By ID Use Case
 * Application layer - business logic
 */

const { TicketNotFoundError, TicketAccessDeniedError } = require('../../domain/errors');

class GetTicketByIdUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(ticketId, userId, userRole) {
    const ticket = await this.ticketRepository.findById(ticketId, {
      populate: [
        { path: 'eventId', select: 'title startTime endTime venue image' },
        { path: 'userId', select: 'fullName email' }
      ]
    });

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    // Check if user owns the ticket or is admin
    const ticketUserId = ticket.userId?._id?.toString() || ticket.userId?.toString() || ticket.userId;
    const currentUserId = userId?.toString() || userId;

    if (ticketUserId !== currentUserId && userRole === 'user') {
      throw new TicketAccessDeniedError('You can only view your own tickets');
    }

    return {
      ticket: {
        id: ticket.id,
        qrCode: ticket.qrCode,
        ticketData: ticket.getTicketData(),
        ticketTypeName: ticket.ticketTypeName,
        price: ticket.price,
        quantity: ticket.quantity,
        status: ticket.status,
        usedAt: ticket.usedAt,
        createdAt: ticket.createdAt,
        event: ticket.eventId,
        user: ticket.userId
      }
    };
  }
}

module.exports = GetTicketByIdUseCase;

