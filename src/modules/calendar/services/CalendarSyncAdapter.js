/**
 * Calendar Sync Adapter
 * Infrastructure layer - adapts calendar sync service
 * Handles syncing Jaaiye events to Google Calendar
 */

const logger = require('../../../utils/logger');

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
        const EventSchema = require('../../event/entities/Event.schema');
        const createdEvents = await EventSchema.find({
          createdBy: userId.toString()
          // Sync ALL events, not just future ones
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
            // Check for invalid_grant error - stop syncing Google for this user
            const isInvalidGrant = error.name === 'GoogleRefreshTokenInvalidError' ||
                                  error.message?.toLowerCase().includes('invalid_grant') ||
                                  error.code === 'invalid_grant';

            if (isInvalidGrant) {
              logger.warn('Google refresh token invalid, stopping Google sync for user:', {
                userId,
                eventId: event._id
              });
              // Mark that we've encountered invalid_grant - will skip remaining events
              errors.push({
                type: 'google_account_invalid',
                userId,
                error: 'Google account needs re-linking. Please re-link your Google account to continue syncing.',
                stopGoogleSync: true
              });
              // Break out of loop - no point continuing to sync Google events
              break;
            }

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

      // Check if Google sync was stopped due to invalid_grant
      const googleAccountInvalid = errors.some(e => e.stopGoogleSync === true);

      // 2. Sync events where user is a participant (skip if Google account invalid)
      if (!googleAccountInvalid) {
        try {
          const EventParticipantSchema = require('../../event/entities/EventParticipant.schema');
          const EventSchema = require('../../event/entities/Event.schema');
          const participantRecords = await EventParticipantSchema.find({
            user: userId,
            status: { $in: ['accepted', 'pending'] }
          }).populate('event');

          for (const participant of participantRecords) {
            if (!participant.event) {
              continue;
            }
            // Sync ALL events, not just future ones

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
              // Check for invalid_grant error
              const isInvalidGrant = error.name === 'GoogleRefreshTokenInvalidError' ||
                                    error.message?.toLowerCase().includes('invalid_grant') ||
                                    error.code === 'invalid_grant';

              if (isInvalidGrant) {
                logger.warn('Google refresh token invalid, stopping Google sync for user:', {
                  userId,
                  eventId: event._id
                });
                errors.push({
                  type: 'google_account_invalid',
                  userId,
                  error: 'Google account needs re-linking. Please re-link your Google account to continue syncing.',
                  stopGoogleSync: true
                });
                break;
              }

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
      } else {
        logger.info('Skipping participant events sync - Google account invalid', { userId });
      }

      // Check again if Google sync was stopped (may have been set in participant sync)
      const stillInvalid = errors.some(e => e.stopGoogleSync === true);

      // 3. Sync events from purchased tickets (skip if Google account invalid)
      if (!stillInvalid) {
        try {
          const TicketSchema = require('../../ticket/entities/Ticket.schema');
          const EventSchema = require('../../event/entities/Event.schema');

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

              // Sync ALL events, not just future ones

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
              // Check for invalid_grant error
              const isInvalidGrant = error.name === 'GoogleRefreshTokenInvalidError' ||
                                    error.message?.toLowerCase().includes('invalid_grant') ||
                                    error.code === 'invalid_grant';

              if (isInvalidGrant) {
                logger.warn('Google refresh token invalid, stopping Google sync for user:', {
                  userId,
                  ticketId: ticket._id,
                  eventId: event._id
                });
                errors.push({
                  type: 'google_account_invalid',
                  userId,
                  error: 'Google account needs re-linking. Please re-link your Google account to continue syncing.',
                  stopGoogleSync: true
                });
                break;
              }

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
      } else {
        logger.info('Skipping ticket events sync - Google account invalid', { userId });
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
