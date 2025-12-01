/**
 * Cancel Ticket Use Case
 * Application layer - business logic
 */

const { TicketNotFoundError, TicketAlreadyUsedError, TicketAlreadyCancelledError, ValidationError } = require('../../domain/errors');
const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');

class CancelTicketUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(ticketId, userId) {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    // Check if user owns the ticket
    const ticketUserId = ticket.userId?.toString() || ticket.userId;
    const currentUserId = userId?.toString() || userId;

    if (ticketUserId !== currentUserId) {
      throw new ValidationError('You can only cancel your own tickets');
    }

    if (ticket.isUsed()) {
      throw new TicketAlreadyUsedError('Cannot cancel a used ticket');
    }

    if (ticket.isCancelled()) {
      throw new TicketAlreadyCancelledError();
    }

    // Cancel ticket
    ticket.cancel();
    await this.ticketRepository.update(ticket.id, {
      status: 'cancelled'
    });

    // Decrement event ticket sales
    const eventDoc = await EventSchema.findById(ticket.eventId);
    if (eventDoc) {
      await eventDoc.decrementTicketSales(ticket.ticketTypeId, ticket.quantity);
    }

    return {
      ticket: {
        id: ticket.id,
        status: ticket.status
      }
    };
  }
}

module.exports = CancelTicketUseCase;

