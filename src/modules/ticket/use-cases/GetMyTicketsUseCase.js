/**
 * Get My Tickets Use Case
 * Application layer - business logic
 */

class GetMyTicketsUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(userId) {
    const tickets = await this.ticketRepository.findByUser(userId, {
      populate: 'eventId'
    });

    // Group tickets by event
    const grouped = tickets.reduce((acc, ticket) => {
      const eventId = ticket.eventId?._id?.toString() || ticket.eventId?.toString() || ticket.eventId;

      if (!acc[eventId]) {
        acc[eventId] = {
          event: {
            id: ticket.eventId?._id || ticket.eventId,
            name: ticket.eventId?.title || ticket.eventId?.name,
            category: ticket.eventId?.category,
            image: ticket.eventId?.image,
            venue: ticket.eventId?.venue,
            ticketFee: ticket.eventId?.ticketFee,
            createdAt: ticket.eventId?.createdAt,
            date: ticket.eventId?.startTime ? new Date(ticket.eventId.startTime).toLocaleDateString() : null,
            time: ticket.eventId?.startTime ? new Date(ticket.eventId.startTime).toLocaleTimeString() : null
          },
          ticketCount: 0,
          tickets: []
        };
      }

      acc[eventId].tickets.push({
        id: ticket.id,
        qrCode: ticket.qrCode,
        ticketTypeName: ticket.ticketTypeName,
        price: ticket.price,
        quantity: ticket.quantity,
        status: ticket.status,
        usedAt: ticket.usedAt,
        createdAt: ticket.createdAt
      });

      acc[eventId].ticketCount += ticket.quantity || 1;

      return acc;
    }, {});

    return {
      ticketsByEvent: Object.values(grouped)
    };
  }
}

module.exports = GetMyTicketsUseCase;

