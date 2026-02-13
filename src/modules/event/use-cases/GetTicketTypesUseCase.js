/**
 * Get Ticket Types Use Case
 * Application layer - get all ticket types for an event
 */

const { EventNotFoundError } = require('../errors');

class GetTicketTypesUseCase {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId) {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    // Return all ticket types (not just available ones)
    const ticketTypes = (event.ticketTypes || []).map(tt => ({
      id: tt._id?.toString() || tt.id,
      type: tt.type || 'custom',
      name: tt.name,
      description: tt.description,
      price: Number(tt.price || 0),
      admissionSize: Number(tt.admissionSize || 1),
      capacity: tt.capacity !== null && tt.capacity !== undefined ? Number(tt.capacity) : null,
      soldCount: Number(tt.soldCount || 0),
      quantityLimit: tt.quantityLimit !== null && tt.quantityLimit !== undefined ? Number(tt.quantityLimit) : null,
      isActive: tt.isActive !== undefined ? tt.isActive : true,
      salesStartDate: tt.salesStartDate,
      salesEndDate: tt.salesEndDate
    }));

    return {
      ticketTypes,
      total: ticketTypes.length
    };
  }
}

module.exports = GetTicketTypesUseCase;

