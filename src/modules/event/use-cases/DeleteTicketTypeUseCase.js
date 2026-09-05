/**
 * Delete Ticket Type Use Case
 * Application layer - delete a ticket type from an event
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');
const EventSchema = require('../entities/Event.schema');
const { canUserManageTicketTypes } = require('../services/EventOwnershipService');

class DeleteTicketTypeUseCase {
  constructor({ eventRepository, eventTeamRepository }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  async execute(eventId, ticketTypeId, userId) {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    // See UpdateTicketTypeUseCase for why this uses the shared
    // EventOwnershipService check instead of a raw creatorId comparison.
    const isCreator = event.creatorId && String(event.creatorId) === String(userId);
    const teamMember = isCreator
      ? null
      : await this.eventTeamRepository.findByEventAndUser(event.id, userId);

    if (!canUserManageTicketTypes({ eventEntity: event, userId, teamMember })) {
      throw new EventAccessDeniedError('You do not have permission to delete ticket types for this event');
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

