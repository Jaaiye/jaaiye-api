/**
 * Get Shared Calendar View Use Case
 * Application layer - use case
 * Fetches both Google Calendar and Jaaiye calendar events for multiple users, grouped by user
 */

const { ValidationError } = require('../errors');
const googleUtils = require('../../../utils/googleUtils');

class GetSharedCalendarViewUseCase {
  constructor({ userRepository, calendarRepository, googleCalendarAdapter, eventRepository, eventParticipantRepository }) {
    this.userRepository = userRepository;
    this.calendarRepository = calendarRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.eventRepository = eventRepository;
    this.eventParticipantRepository = eventParticipantRepository;
  }

  /**
   * Execute get shared calendar view
   * @param {string} currentUserId - Current user ID (requesting user)
   * @param {Array<string>} userIds - Array of user IDs to fetch events for
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @returns {Promise<Object>} Events grouped by user
   */
  async execute(currentUserId, userIds, timeMin, timeMax) {
    userIds.unshift(currentUserId);
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new ValidationError('userIds array is required and must not be empty');
    }

    const eventsByUser = [];
    let totalEvents = 0;

    // Process each user in parallel
    const userPromises = userIds.map(async (userId) => {
      try {
        // Get user info
        const user = await this.userRepository.findById(userId);
        if (!user) {
          console.warn(`User not found: ${userId}`);
          return null;
        }

        // Get user's calendar
        const calendar = await this.calendarRepository.findByOwner(userId);
        const allEvents = [];

        // 1. Fetch Jaaiye calendar events
        if (calendar) {
          try {
            // Fetch events where user is the creator (createdBy)
            const createdEventsResult = await this.eventRepository.find({
              createdBy: userId.toString(),
              status: 'scheduled' // Only scheduled events
            }, {
              limit: 1000,
              sort: { startTime: 1 }
            });

            // Fetch events where user is a participant
            const EventParticipantSchema = require('../../event/entities/EventParticipant.schema');
            const participantEvents = await EventParticipantSchema.find({
              user: userId,
              status: { $in: ['accepted', 'pending'] }
            })
              .populate({
                path: 'event',
                match: {
                  startTime: { $gte: new Date(timeMin), $lte: new Date(timeMax) },
                  status: 'scheduled'
                }
              })
              .lean();

            // Format created events
            const createdEvents = createdEventsResult.events.map(event => {
              const eventObj = event.toJSON ? event.toJSON() : event;
              return {
                id: eventObj.id || eventObj._id?.toString(),
                title: eventObj.title || 'No Title',
                description: eventObj.description || '',
                location: eventObj.venue || '',
                startTime: eventObj.startTime,
                endTime: eventObj.endTime || eventObj.startTime,
                isAllDay: eventObj.isAllDay || false,
                calendar: {
                  id: calendar.id,
                  name: calendar.name || 'Jaaiye Calendar',
                  color: calendar.color || '#6366F1'
                },
                source: 'jaaiye',
                category: eventObj.category,
                image: eventObj.image,
                attendeeCount: eventObj.attendeeCount || 0,
                isCreator: true, // Mark as creator event
                createdAt: eventObj.createdAt,
                updatedAt: eventObj.updatedAt
              };
            });

            // Format participant events (exclude duplicates with created events)
            const createdEventIds = new Set(createdEvents.map(e => e.id));
            participantEvents.forEach(participant => {
              if (participant.event) {
                const eventId = participant.event._id?.toString() || participant.event.id;
                // Only add if not already in created events (user might be both creator and participant)
                if (!createdEventIds.has(eventId)) {
                  const eventObj = participant.event;
                  allEvents.push({
                    id: eventId,
                    title: eventObj.title || 'No Title',
                    description: eventObj.description || '',
                    location: eventObj.venue || '',
                    startTime: eventObj.startTime,
                    endTime: eventObj.endTime || eventObj.startTime,
                    isAllDay: eventObj.isAllDay || false,
                    calendar: {
                      id: calendar.id,
                      name: calendar.name || 'Jaaiye Calendar',
                      color: calendar.color || '#6366F1'
                    },
                    source: 'jaaiye',
                    category: eventObj.category,
                    image: eventObj.image,
                    attendeeCount: eventObj.attendeeCount || 0,
                    participantStatus: participant.status,
                    isParticipant: true, // Mark as participant event
                    createdAt: eventObj.createdAt,
                    updatedAt: eventObj.updatedAt
                  });
                }
              }
            });

            allEvents.push(...createdEvents);
          } catch (error) {
            console.error(`Error fetching Jaaiye events for user ${userId}:`, error.message);
          }
        }

        // 2. Fetch Google Calendar events (if user has Google account linked and has selected calendars)
        if (user.googleCalendar && user.googleCalendar.refreshToken) {
          // Use selectedCalendarIds - if empty, user doesn't want to share calendar
          const selectedCalendarIds = user.googleCalendar.selectedCalendarIds || [];
          if (selectedCalendarIds.length > 0) {
            try {
              const googleEvents = await this.googleCalendarAdapter.listEvents(user, timeMin, timeMax, selectedCalendarIds);

              // Get calendar information for event enhancement
              const calendars = await this.googleCalendarAdapter.listCalendars(user);
              const formattedCalendars = googleUtils.formatGoogleCalendarData(calendars);

              // Format Google events
              const formattedGoogleEvents = googleEvents.map(event => {
                const calendarId = event.organizer?.email || event.calendarId || 'primary';
                const calendar = formattedCalendars[calendarId] || {};

                return {
                  id: event.id,
                  title: event.summary || 'No Title',
                  description: event.description || '',
                  location: event.location || '',
                  startTime: event.start?.dateTime || event.start?.date,
                  endTime: event.end?.dateTime || event.end?.date,
                  isAllDay: !!event.start?.date,
                  calendar: {
                    id: calendarId,
                    name: calendar.name || 'Google Calendar',
                    color: calendar.color || '#4285F4'
                  },
                  source: 'google',
                  external: {
                    google: {
                      calendarId: calendarId,
                      eventId: event.id,
                      etag: event.etag,
                      htmlLink: event.htmlLink
                    }
                  },
                  attendees: event.attendees || [],
                  recurringEventId: event.recurringEventId,
                  originalStartTime: event.originalStartTime,
                  createdAt: event.created,
                  updatedAt: event.updated
                };
              });

              allEvents.push(...formattedGoogleEvents);
            } catch (error) {
              console.error(`Error fetching Google events for user ${userId}:`, error.message);
              // Continue even if Google fetch fails
            }
          }
          // If selectedCalendarIds is empty, return no Google events (user doesn't want to share)
        }

        // Sort all events by start time
        allEvents.sort((a, b) => {
          const aTime = new Date(a.startTime);
          const bTime = new Date(b.startTime);
          return aTime - bTime;
        });

        return {
          userId: user.id,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            profilePicture: user.profilePicture
          },
          events: allEvents,
          totalEvents: allEvents.length
        };
      } catch (error) {
        console.error(`Error fetching events for user ${userId}:`, error.message);
        // Return empty events for this user on error
        try {
          const user = await this.userRepository.findById(userId);
          return {
            userId: user?.id || userId,
            user: user ? {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              profilePicture: user.profilePicture
            } : { id: userId },
            events: [],
            totalEvents: 0,
            error: error.message
          };
        } catch (err) {
          return {
            userId: userId,
            user: { id: userId },
            events: [],
            totalEvents: 0,
            error: error.message
          };
        }
      }
    });

    // Wait for all users to be processed
    const results = await Promise.all(userPromises);

    // Filter out null results and calculate totals
    results.forEach(result => {
      if (result) {
        eventsByUser.push(result);
        totalEvents += result.totalEvents || 0;
      }
    });

    return {
      eventsByUser,
      timeRange: {
        start: timeMin,
        end: timeMax
      },
      totalUsers: eventsByUser.length,
      totalEvents
    };
  }
}

module.exports = GetSharedCalendarViewUseCase;

