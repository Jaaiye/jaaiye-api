/**
 * Get Event Tickets Use Case
 * Application layer - business logic
 */

const { NotFoundError } = require('../../common/errors');
const EventSchema = require('../../event/entities/Event.schema');

class GetEventTicketsUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(eventId) {
    // Check if event exists
    const event = await EventSchema.findById(eventId).lean();
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const tickets = await this.ticketRepository.findByEvent(eventId, {
      populate: 'userId'
    });

    return {
      event: {
        id: event._id,
        title: event.title,
        attendeeCount: event.attendeeCount,
        ticketTypes: (event.ticketTypes || []).map(tt => ({
          id: tt._id,
          name: tt.name,
          price: tt.price,
          soldCount: tt.soldCount,
          capacity: tt.capacity
        }))
      },
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        qrCode: ticket.qrCode,
        ticketTypeName: ticket.ticketTypeName,
        price: ticket.price,
        quantity: ticket.quantity,
        status: ticket.status,
        usedAt: ticket.usedAt,
        createdAt: ticket.createdAt,
        user: ticket.userId
      }))
    };
  }
}

module.exports = GetEventTicketsUseCase;

