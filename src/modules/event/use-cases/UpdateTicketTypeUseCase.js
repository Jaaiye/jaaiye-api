/**
 * Update Ticket Type Use Case
 * Application layer - update a ticket type for an event
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');
const EventSchema = require('../entities/Event.schema');

class UpdateTicketTypeUseCase {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId, ticketTypeId, userId, updateData) {
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

    // Only event creator can update ticket types
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can update ticket types');
    }

    // Only events can have ticket types
    if (event.category !== 'event') {
      throw new ValidationError('Only events can have ticket types');
    }

    // Get event as Mongoose document to use schema methods
    const eventDoc = await EventSchema.findById(eventId);
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

    // Update ticket type
    await eventDoc.updateTicketType(ticketTypeId, updateObj);
    const updatedEvent = await this.eventRepository.findById(eventId);

    return updatedEvent;
  }
}

module.exports = UpdateTicketTypeUseCase;

