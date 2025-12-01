/**
 * Calendar Sync Adapter
 * Infrastructure layer - adapts calendar sync service
 * Handles syncing Jaaiye events to Google Calendar
 */

const logger = require('../../../../utils/logger');

class CalendarSyncAdapter {
  constructor({
    googleCalendarAdapter,
    userRepository,
    eventRepository,
    ticketRepository
  }) {
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.userRepository = userRepository;
    this.eventRepository = eventRepository;
    this.ticketRepository = ticketRepository;
  }

  /**
   * Sync existing events to Google Calendar
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sync result { eventsSynced, ticketsSynced, errors }
   */
  async syncExistingEventsToCalendar(userId) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user || !user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new Error('User not found or Google Calendar not linked');
      }

      let eventsSynced = 0;
      let ticketsSynced = 0;
      const errors = [];

      // 1. Sync events where user is the creator
      try {
        const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');
        const createdEvents = await EventSchema.find({
          creator: userId,
          startTime: { $gte: new Date() } // Only future events
        });

        for (const event of createdEvents) {
          try {
            // Check if event already has Google Calendar entry
            if (event.external && event.external.google && event.external.google.eventId) {
              logger.info('Event already has Google Calendar entry, skipping', {
                eventId: event._id,
                googleEventId: event.external.google.eventId
              });
              continue;
            }

            const eventBody = {
              summary: event.title,
              description: event.description || `Event created by you: ${event.title}`,
              start: { dateTime: new Date(event.startTime).toISOString() },
              end: { dateTime: new Date(event.endTime || event.startTime).toISOString() },
              location: event.venue || undefined
            };

            const googleEvent = await this.googleCalendarAdapter.insertEvent(user, eventBody);

            // Update event with Google Calendar info
            await EventSchema.findByIdAndUpdate(event._id, {
              $set: {
                'external.google': {
                  calendarId: user.googleCalendar.jaaiyeCalendarId,
                  eventId: googleEvent.id,
                  etag: googleEvent.etag
                }
              }
            });

            eventsSynced++;
            logger.info('Synced created event to calendar', {
              userId,
              eventId: event._id,
              googleEventId: googleEvent.id
            });
          } catch (error) {
            logger.error('Failed to sync created event', {
              userId,
              eventId: event._id,
              error: error.message
            });
            errors.push({ type: 'created_event', eventId: event._id, error: error.message });
          }
        }
      } catch (error) {
        logger.error('Failed to fetch created events for sync', { userId, error: error.message });
        errors.push({ type: 'fetch_created_events', error: error.message });
      }

      // 2. Sync events where user is a participant
      try {
        const EventParticipantSchema = require('../../../event/infrastructure/persistence/schemas/EventParticipant.schema');
        const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');
        const participantRecords = await EventParticipantSchema.find({
          user: userId,
          status: { $in: ['accepted', 'pending'] }
        }).populate('event');

        for (const participant of participantRecords) {
          if (!participant.event || new Date(participant.event.startTime) < new Date()) {
            continue;
          }

          const event = participant.event;
          try {
            // Check if event already has Google Calendar entry
            if (event.external && event.external.google && event.external.google.eventId) {
              continue;
            }

            const eventBody = {
              summary: event.title,
              description: event.description || `You're invited to: ${event.title}`,
              start: { dateTime: new Date(event.startTime).toISOString() },
              end: { dateTime: new Date(event.endTime || event.startTime).toISOString() },
              location: event.venue || undefined
            };

            const googleEvent = await this.googleCalendarAdapter.insertEvent(user, eventBody);

            // Update event with Google Calendar info
            await EventSchema.findByIdAndUpdate(event._id, {
              $set: {
                'external.google': {
                  calendarId: user.googleCalendar.jaaiyeCalendarId,
                  eventId: googleEvent.id,
                  etag: googleEvent.etag
                }
              }
            });

            eventsSynced++;
            logger.info('Synced participant event to calendar', {
              userId,
              eventId: event._id,
              googleEventId: googleEvent.id
            });
          } catch (error) {
            logger.error('Failed to sync participant event', {
              userId,
              eventId: event._id,
              error: error.message
            });
            errors.push({ type: 'participant_event', eventId: event._id, error: error.message });
          }
        }
      } catch (error) {
        logger.error('Failed to fetch participant events for sync', { userId, error: error.message });
        errors.push({ type: 'fetch_participant_events', error: error.message });
      }

      // 3. Sync events from purchased tickets
      try {
        const TicketSchema = require('../../../ticket/infrastructure/persistence/schemas/Ticket.schema');
        const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');

        const tickets = await TicketSchema.find({
          userId: userId,
          status: 'active'
        }).populate('eventId');

        for (const ticket of tickets) {
          if (!ticket.eventId) continue;

          const event = ticket.eventId;
          try {
            // Check if event already has Google Calendar entry
            if (event.external && event.external.google && event.external.google.eventId) {
              continue;
            }

            // Only sync future events
            if (new Date(event.startTime) < new Date()) {
              continue;
            }

            const eventBody = {
              summary: event.title,
              description: event.description || `Ticket purchased for: ${event.title}`,
              start: { dateTime: new Date(event.startTime).toISOString() },
              end: { dateTime: new Date(event.endTime || event.startTime).toISOString() },
              location: event.venue || undefined
            };

            const googleEvent = await this.googleCalendarAdapter.insertEvent(user, eventBody);

            // Update event with Google Calendar info
            await EventSchema.findByIdAndUpdate(event._id, {
              $set: {
                'external.google': {
                  calendarId: user.googleCalendar.jaaiyeCalendarId,
                  eventId: googleEvent.id,
                  etag: googleEvent.etag
                }
              }
            });

            ticketsSynced++;
            logger.info('Synced ticket event to calendar', {
              userId,
              ticketId: ticket._id,
              eventId: event._id,
              googleEventId: googleEvent.id
            });
          } catch (error) {
            logger.error('Failed to sync ticket event', {
              userId,
              ticketId: ticket._id,
              eventId: event._id,
              error: error.message
            });
            errors.push({ type: 'ticket_event', ticketId: ticket._id, eventId: event._id, error: error.message });
          }
        }
      } catch (error) {
        logger.error('Failed to fetch tickets for sync', { userId, error: error.message });
        errors.push({ type: 'fetch_tickets', error: error.message });
      }

      const result = {
        success: true,
        eventsSynced,
        ticketsSynced,
        totalSynced: eventsSynced + ticketsSynced,
        errors: errors.length > 0 ? errors : undefined
      };

      logger.info('Calendar sync completed', {
        userId,
        ...result
      });

      return result;
    } catch (error) {
      logger.error('Calendar sync failed', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = CalendarSyncAdapter;
