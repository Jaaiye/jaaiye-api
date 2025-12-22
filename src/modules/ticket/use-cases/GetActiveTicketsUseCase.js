/**
 * Get Active Tickets Use Case
 * Application layer - business logic
 */

class GetActiveTicketsUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(userId) {
    const tickets = await this.ticketRepository.findActiveByUser(userId, {
      populate: 'eventId'
    });

    return {
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        qrCode: ticket.qrCode,
        ticketTypeName: ticket.ticketTypeName,
        price: ticket.price,
        quantity: ticket.quantity,
        createdAt: ticket.createdAt,
        event: ticket.eventId
      }))
    };
  }
}

module.exports = GetActiveTicketsUseCase;

