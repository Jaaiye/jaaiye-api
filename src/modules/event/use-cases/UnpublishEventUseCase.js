/**
 * Unpublish Event Use Case
 * Application layer - unpublish a published event (changes status back to draft)
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');
// Not common/errors' ValidationError: its .name collides with Mongoose's
// ValidationError, which errorHandler.js special-cases and hijacks with a
// hardcoded generic message, discarding whatever we throw here.
const { BadRequestError } = require('../../common/errors');

class UnpublishEventUseCase {
  constructor({ eventRepository }) {
    this.eventRepository = eventRepository;
  }

  async execute(eventId, userId) {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    // Only event creator can unpublish
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can unpublish this event');
    }

    // Only published events can be unpublished
    if (event.status !== 'published' && event.status !== 'scheduled') {
      throw new BadRequestError(`Cannot unpublish event with status: ${event.status}. Only published/scheduled events can be unpublished.`);
    }

    // Check if tickets have been sold
    if (event.attendeeCount > 0) {
      throw new BadRequestError('Cannot unpublish event with sold tickets. Please cancel the event instead to process refunds.');
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

