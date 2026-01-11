/**
 * Publish Event Use Case
 * Application layer - publish a draft event (makes it available for ticket sales)
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');

class PublishEventUseCase {
  constructor({ eventRepository, walletRepository, notificationAdapter }) {
    this.eventRepository = eventRepository;
    this.walletRepository = walletRepository;
    this.notificationAdapter = notificationAdapter;
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
    const updatedEvent = await this.eventRepository.update(event._id || event.id, {
      status: 'published',
      publishedAt: new Date()
    });

    // Ensure wallet exists for published events (category: event)
    if (event.category === 'event') {
      try {
        let wallet = await this.walletRepository.findByOwner('EVENT', event._id || event.id);
        if (!wallet) {
          wallet = await this.walletRepository.create({
            ownerType: 'EVENT',
            ownerId: event._id || event.id,
            balance: 0.00,
            currency: 'NGN'
          });
        }
      } catch (walletError) {
        // Log but don't fail publish if wallet creation fails
        console.error(`Failed to create wallet for published event ${event._id || event.id}:`, walletError.message);
      }

      // Send push notification to all users when event is published
      if (this.notificationAdapter) {
        setImmediate(async () => {
          try {
            // Fetch event slug from schema (slug not in entity)
            const EventSchema = require('../entities/Event.schema');
            const eventDoc = await EventSchema.findById(event._id || event.id).select('slug title').lean();
            const eventSlug = eventDoc?.slug || eventId;
            const eventTitle = eventDoc?.title || updatedEvent.title;

            const UserSchema = require('../../common/entities/User.schema');
            const allUsers = await UserSchema.find({ isActive: true, isBlocked: false })
              .select('_id')
              .lean();

            await Promise.all(
              allUsers.map(user =>
                this.notificationAdapter.send(user._id.toString(), {
                  title: 'New Event Available! 🎉',
                  body: `Check out "${eventTitle}" - tickets are now available!`
                }, {
                  type: 'new_event',
                  eventId: event._id || event.id,
                  slug: eventSlug,
                  path: `eventScreen/${eventSlug}`
                }).catch(err => {
                  console.warn(`Failed to send notification to user ${user._id}:`, err.message);
                })
              )
            );
          } catch (error) {
            console.error('[PublishEvent] Failed to send notifications to all users:', error);
          }
        });
      }
    }

    return updatedEvent;
  }
}

module.exports = PublishEventUseCase;

