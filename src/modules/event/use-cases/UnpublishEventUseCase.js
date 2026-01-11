/**
 * Unpublish Event Use Case
 * Application layer - unpublish a published event (changes status back to draft)
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');

class UnpublishEventUseCase {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId, userId) {
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

    // Only event creator can unpublish
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can unpublish this event');
    }

    // Only published events can be unpublished
    if (event.status !== 'published' && event.status !== 'scheduled') {
      throw new ValidationError(`Cannot unpublish event with status: ${event.status}. Only published/scheduled events can be unpublished.`);
    }

    // Check if tickets have been sold
    if (event.attendeeCount > 0) {
      throw new ValidationError('Cannot unpublish event with sold tickets. Please cancel the event instead to process refunds.');
    }

    // Update status to draft
    const updatedEvent = await this.eventRepository.update(event._id || event.id, {
      status: 'draft',
      publishedAt: null
    });

    return updatedEvent;
  }
}

module.exports = UnpublishEventUseCase;

