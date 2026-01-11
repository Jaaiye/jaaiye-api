/**
 * Delete Ticket Type Use Case
 * Application layer - delete a ticket type from an event
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');
const EventSchema = require('../entities/Event.schema');

class DeleteTicketTypeUseCase {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId, ticketTypeId, userId) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(eventId);
    let event;

    if (isObjectId) {
      event = await this.eventRepository.findById(eventId);
    } else {
      event = await this.eventRepository.findBySlug(eventId);
    }

    if (!event) {
      throw new EventNotFoundError();
    }

    // Only event creator can delete ticket types
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can delete ticket types');
    }

    // Only events can have ticket types
    if (event.category !== 'event') {
      throw new ValidationError('Only events can have ticket types');
    }

    // Get event as Mongoose document to use schema methods
    const eventDoc = await EventSchema.findById(event._id || event.id);
    if (!eventDoc) {
      throw new EventNotFoundError();
    }

    const ticketType = eventDoc.ticketTypes.id(ticketTypeId);
    if (!ticketType) {
      throw new ValidationError('Ticket type not found');
    }

    // Cannot delete if tickets have been sold
    if (ticketType.soldCount > 0) {
      throw new ValidationError('Cannot delete ticket type with sold tickets. Deactivate it instead.');
    }

    // Cannot delete if it's the only ticket type
    if (eventDoc.ticketTypes.length === 1) {
      throw new ValidationError('Cannot delete the only ticket type. Events must have at least one ticket type.');
    }

    // Remove ticket type
    await eventDoc.removeTicketType(ticketTypeId);
    const updatedEvent = await this.eventRepository.findById(event._id || event.id);

    return updatedEvent;
  }
}

module.exports = DeleteTicketTypeUseCase;

