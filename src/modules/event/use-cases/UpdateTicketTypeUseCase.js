/**
 * Update Ticket Type Use Case
 * Application layer - update a ticket type for an event
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');
const EventSchema = require('../entities/Event.schema');
const { canUserManageTicketTypes } = require('../services/EventOwnershipService');

class UpdateTicketTypeUseCase {
  constructor({ eventRepository, eventTeamRepository }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  async execute(eventId, ticketTypeId, userId, updateData) {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    // Creator or an accepted co-organizer/creator team member with the
    // manageTickets permission can update ticket types - same rule the
    // issueTicket flow uses, via the shared EventOwnershipService helper.
    // The previous check here only compared creatorId and silently
    // allowed ANY authenticated user through for non-'user'-origin events
    // or events missing a creatorId - this closes that gap.
    const isCreator = event.creatorId && String(event.creatorId) === String(userId);
    const teamMember = isCreator
      ? null
      : await this.eventTeamRepository.findByEventAndUser(event.id, userId);

    if (!canUserManageTicketTypes({ eventEntity: event, userId, teamMember })) {
      throw new EventAccessDeniedError('You do not have permission to update ticket types for this event');
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

    const predefinedTypes = ['regular', 'early_bird', 'couples', 'group_3', 'group_5', 'complimentary'];

    // Validate: Cannot change predefined type to another predefined type
    if (ticketType.type && updateData.type) {
      if (predefinedTypes.includes(ticketType.type) && predefinedTypes.includes(updateData.type) && ticketType.type !== updateData.type) {
        throw new ValidationError('Cannot change predefined ticket type to another predefined type');
      }
    }

    // Validate: Cannot reduce capacity below sold count
    if (updateData.capacity !== undefined && updateData.capacity !== null) {
      const newCapacity = Number(updateData.capacity);
      if (newCapacity < ticketType.soldCount) {
        throw new ValidationError(`Cannot set capacity below sold count (${ticketType.soldCount})`);
      }
    }

    // Validate: Cannot change price if tickets have been sold (unless it's a price increase)
    if (updateData.price !== undefined && ticketType.soldCount > 0) {
      const newPrice = Number(updateData.price);
      const currentPrice = Number(ticketType.price);
      if (newPrice < currentPrice) {
        throw new ValidationError('Cannot reduce price for ticket type with sold tickets');
      }
    }

    // Validate uniqueness for predefined types
    if (updateData.type && predefinedTypes.includes(updateData.type)) {
      const existingType = eventDoc.ticketTypes.find(
        tt => tt.type === updateData.type && tt._id.toString() !== ticketTypeId.toString()
      );
      if (existingType) {
        throw new ValidationError(`A ticket type of type '${updateData.type}' already exists`);
      }
    }

    // Build update object
    const updateObj = {};
    if (updateData.name !== undefined) updateObj.name = updateData.name;
    if (updateData.description !== undefined) updateObj.description = updateData.description;
    if (updateData.price !== undefined) updateObj.price = Number(updateData.price);
    if (updateData.capacity !== undefined) updateObj.capacity = updateData.capacity === null || updateData.capacity === '' ? null : Number(updateData.capacity);
    if (updateData.isActive !== undefined) updateObj.isActive = Boolean(updateData.isActive);
    if (updateData.salesStartDate !== undefined) updateObj.salesStartDate = updateData.salesStartDate ? new Date(updateData.salesStartDate) : null;
    if (updateData.salesEndDate !== undefined) updateObj.salesEndDate = updateData.salesEndDate ? new Date(updateData.salesEndDate) : null;
    if (updateData.type !== undefined) updateObj.type = updateData.type;
    if (updateData.quantityLimit !== undefined) updateObj.quantityLimit = updateData.quantityLimit === null || updateData.quantityLimit === '' ? null : Number(updateData.quantityLimit);
    if (updateData.admissionSize !== undefined) updateObj.admissionSize = Math.max(1, Number(updateData.admissionSize));

    // Update ticket type
    await eventDoc.updateTicketType(ticketTypeId, updateObj);
    const updatedEvent = await this.eventRepository.findById(event._id || event.id);

    return updatedEvent;
  }
}

module.exports = UpdateTicketTypeUseCase;

