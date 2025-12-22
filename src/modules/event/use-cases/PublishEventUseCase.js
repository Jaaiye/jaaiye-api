/**
 * Publish Event Use Case
 * Application layer - publish a draft event (makes it available for ticket sales)
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');

class PublishEventUseCase {
  constructor({ eventRepository, walletRepository }) {
    this.eventRepository = eventRepository;
    this.walletRepository = walletRepository;
  }

  async execute(eventId, userId) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    // Only event creator can publish
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can publish this event');
    }

    // Only draft events can be published
    if (event.status !== 'draft') {
      throw new ValidationError(`Cannot publish event with status: ${event.status}. Only draft events can be published.`);
    }

    // Events must have at least one ticket type
    if (event.category === 'event' && (!event.ticketTypes || event.ticketTypes.length === 0)) {
      throw new ValidationError('Events must have at least one ticket type before publishing');
    }

    // Update status to published
    const updatedEvent = await this.eventRepository.update(eventId, {
      status: 'published',
      publishedAt: new Date()
    });

    // Ensure wallet exists for published events (category: event)
    if (event.category === 'event') {
      try {
        let wallet = await this.walletRepository.findByOwner('EVENT', eventId);
        if (!wallet) {
          wallet = await this.walletRepository.create({
            ownerType: 'EVENT',
            ownerId: eventId,
            balance: 0.00,
            currency: 'NGN'
          });
        }
      } catch (walletError) {
        // Log but don't fail publish if wallet creation fails
        console.error(`Failed to create wallet for published event ${eventId}:`, walletError.message);
      }
    }

    return updatedEvent;
  }
}

module.exports = PublishEventUseCase;

