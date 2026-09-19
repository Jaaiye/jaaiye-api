/**
 * Complete Event Use Case
 * Application layer - mark event as completed and deactivate wallet
 */

const { EventNotFoundError, EventAccessDeniedError } = require('../errors');
// Not common/errors' ValidationError: its .name collides with Mongoose's
// ValidationError, which errorHandler.js special-cases and hijacks with a
// hardcoded generic message, discarding whatever we throw here.
const { BadRequestError } = require('../../common/errors');

class CompleteEventUseCase {
  constructor({ eventRepository, walletRepository }) {
    this.eventRepository = eventRepository;
    this.walletRepository = walletRepository;
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

    // Only event creator can complete
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can complete this event');
    }

    // Cannot complete already completed or cancelled events
    if (event.status === 'completed') {
      throw new BadRequestError('Event is already completed');
    }
    if (event.status === 'cancelled') {
      throw new BadRequestError('Cannot complete a cancelled event');
    }

    // Update event status to completed
    const updatedEvent = await this.eventRepository.update(event._id || event.id, {
      status: 'completed'
    });

    // Deactivate wallet for completed event
    if (event.category === 'event') {
      try {
        const wallet = await this.walletRepository.findByOwner('EVENT', event._id || event.id);
        if (wallet) {
          await this.walletRepository.update(wallet.id, { isActive: false });
        }
      } catch (walletError) {
        console.error(`Failed to deactivate wallet for completed event ${event._id || event.id}:`, walletError.message);
        // Don't fail completion if wallet deactivation fails
      }
    }

    return updatedEvent;
  }
}

module.exports = CompleteEventUseCase;

