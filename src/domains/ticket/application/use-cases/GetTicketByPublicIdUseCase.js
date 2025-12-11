/**
 * Get Ticket By Public ID Use Case
 * Application layer - business logic
 */

const { TicketNotFoundError } = require('../../domain/errors');

class GetTicketByPublicIdUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(publicId, eventId = null) {
    const ticket = await this.ticketRepository.findByPublicId(publicId, {
      populate: [
        { path: 'eventId', select: 'title startTime endTime venue image' },
        { path: 'userId', select: 'fullName email username' },
        { path: 'verifiedBy', select: 'fullName email username' }
      ]
    });

    if (!ticket) {
      throw new TicketNotFoundError('Ticket not found');
    }

    // If eventId is provided, verify the ticket belongs to that event
    if (eventId) {
      const ticketEventId = ticket.eventId?._id?.toString() || ticket.eventId?.toString() || ticket.eventId;
      const requestedEventId = eventId.toString();
      if (ticketEventId !== requestedEventId) {
        throw new TicketNotFoundError('Ticket does not belong to this event');
      }
    }

    // Debug: log the ticket userId to see what we're getting
    console.log('[GetTicketByPublicIdUseCase] ticket.userId:', ticket.userId);
    console.log('[GetTicketByPublicIdUseCase] ticket.userId type:', typeof ticket.userId);
    if (ticket.userId && typeof ticket.userId === 'object') {
      console.log('[GetTicketByPublicIdUseCase] ticket.userId keys:', Object.keys(ticket.userId));
      console.log('[GetTicketByPublicIdUseCase] ticket.userId.fullName:', ticket.userId.fullName);
    }

    return {
      ticket: {
        id: ticket.id,
        publicId: ticket.publicId,
        qrCode: ticket.qrCode,
        ticketData: ticket.getTicketData(),
        ticketTypeName: ticket.ticketTypeName,
        price: ticket.price,
        quantity: ticket.quantity,
        status: ticket.status,
        usedAt: ticket.usedAt,
        verifiedBy: ticket.verifiedBy,
        createdAt: ticket.createdAt,
        event: ticket.eventId,
        user: ticket.userId // This should be the populated userId object from the repository
      }
    };
  }
}

module.exports = GetTicketByPublicIdUseCase;

