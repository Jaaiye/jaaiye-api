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
    // Validate inputs with specific error messages
    if (!currentUserId) {
      throw new ValidationError('Current user ID is missing. Please ensure you are authenticated.');
    }

    if (!timeMin || !timeMax) {
      throw new ValidationError(`Missing time range: ${!timeMin ? 'timeMin' : 'timeMax'} is required. Both timeMin and timeMax must be provided in ISO 8601 format.`);
    }

    // Validate dates
    const timeMinDate = new Date(timeMin);
    const timeMaxDate = new Date(timeMax);

    if (isNaN(timeMinDate.getTime())) {
      throw new ValidationError(`Invalid timeMin format: "${timeMin}". Expected ISO 8601 format (e.g., 2024-01-01T00:00:00Z).`);
    }

    if (isNaN(timeMaxDate.getTime())) {
      throw new ValidationError(`Invalid timeMax format: "${timeMax}". Expected ISO 8601 format (e.g., 2024-01-31T23:59:59Z).`);
    }

    if (timeMinDate >= timeMaxDate) {
      throw new ValidationError(`Invalid time range: timeMin (${timeMin}) must be before timeMax (${timeMax}).`);
    }

    // userIds can be empty - if so, we'll only fetch current user's events
    // Always include current user in the list (deduplicate if already present)
    const uniqueUserIds = Array.isArray(userIds) ? [...new Set([currentUserId, ...userIds])] : [currentUserId];

    const eventsByUser = [];
    let totalEvents = 0;

    // Process each user in parallel
    const userPromises = uniqueUserIds.map(async (userId) => {
      try {
        // Get user info
        const user = await this.userRepository.findById(userId);
        if (!user) {
          console.warn(`User not found: ${userId}`);
          return {
            userId: userId,
            user: { id: userId },
            events: [],
            totalEvents: 0,
            error: `User with ID "${userId}" not found`,
            errorType: 'USER_NOT_FOUND'
          };
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
            // Don't throw - continue with Google events if available
            // Error will be included in response
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
              // Determine error type for better mobile handling
              const errorType = error.name === 'GoogleAccountNotLinkedError'
                ? 'GOOGLE_CALENDAR_NOT_LINKED'
                : error.name === 'GoogleRefreshTokenInvalidError'
                ? 'GOOGLE_CALENDAR_TOKEN_INVALID'
                : error.name === 'GoogleTokenExpiredError'
                ? 'GOOGLE_CALENDAR_TOKEN_EXPIRED'
                : 'GOOGLE_CALENDAR_FETCH_ERROR';

              // Store error info but don't fail the entire request
              // Error will be included in user's response
              if (!allEvents.find(e => e.errorType === errorType)) {
                allEvents.push({
                  error: `Failed to fetch Google Calendar events: ${error.message}`,
                  errorType: errorType,
                  source: 'google'
                });
              }
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

        // Filter out error objects from events array before returning
        const validEvents = allEvents.filter(e => !e.errorType);
        const errors = allEvents.filter(e => e.errorType);

        return {
          userId: user.id,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            profilePicture: user.profilePicture
          },
          events: validEvents,
          totalEvents: validEvents.length,
          ...(errors.length > 0 && {
            errors: errors.map(e => ({
              message: e.error,
              type: e.errorType,
              source: e.source
            })),
            googleCalendarLinked: !errors.some(e => e.errorType === 'GOOGLE_CALENDAR_NOT_LINKED')
          })
        };
      } catch (error) {
        console.error(`Error fetching events for user ${userId}:`, error.message, error.stack);

        // Determine error type
        const errorType = error.name === 'GoogleAccountNotLinkedError'
          ? 'GOOGLE_CALENDAR_NOT_LINKED'
          : error.name === 'GoogleRefreshTokenInvalidError'
          ? 'GOOGLE_CALENDAR_TOKEN_INVALID'
          : error.name === 'GoogleTokenExpiredError'
          ? 'GOOGLE_CALENDAR_TOKEN_EXPIRED'
          : error.name === 'ValidationError'
          ? 'VALIDATION_ERROR'
          : 'FETCH_ERROR';

        // Return empty events for this user on error with detailed error info
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
            error: error.message,
            errorType: errorType,
            errorDetails: process.env.NODE_ENV === 'development' ? {
              stack: error.stack,
              name: error.name,
              code: error.code
            } : undefined
          };
        } catch (err) {
          return {
            userId: userId,
            user: { id: userId },
            events: [],
            totalEvents: 0,
            error: `Failed to fetch events for user ${userId}: ${error.message}`,
            errorType: errorType,
            errorDetails: process.env.NODE_ENV === 'development' ? {
              originalError: error.message,
              lookupError: err.message
            } : undefined
          };
        }
      }
    });

    // Wait for all users to be processed
    const results = await Promise.all(userPromises);

    // Check current user's Google Calendar status for the summary
    let currentUserGoogleCalendarLinked = false;
    let googleCalendarMessage = '';
    try {
      const currentUser = await this.userRepository.findById(currentUserId);
      if (currentUser && currentUser.googleCalendar && currentUser.googleCalendar.refreshToken) {
        currentUserGoogleCalendarLinked = true;
      } else {
        googleCalendarMessage = 'Google Calendar is not linked. Please link your Google account to view Google Calendar events.';
      }
    } catch (error) {
      console.warn('Failed to check current user Google Calendar status:', error.message);
      googleCalendarMessage = 'Unable to verify Google Calendar link status.';
    }

    // Process results and calculate totals
    let usersWithErrors = 0;
    let usersNotFound = 0;

    results.forEach(result => {
      if (result) {
        eventsByUser.push(result);
        totalEvents += result.totalEvents || 0;

        if (result.error) {
          usersWithErrors++;
        }
        if (result.errorType === 'USER_NOT_FOUND') {
          usersNotFound++;
        }
      }
    });

    // Build summary
    const summary = {
      eventsByUser,
      timeRange: {
        start: timeMin,
        end: timeMax
      },
      totalUsers: eventsByUser.length,
      totalEvents,
      requestedUsers: uniqueUserIds.length,
      googleCalendarLinked: currentUserGoogleCalendarLinked
    };

    // Add Google Calendar message if not linked
    if (!currentUserGoogleCalendarLinked && googleCalendarMessage) {
      summary.message = googleCalendarMessage;
    }

    // Add warnings if there were issues
    if (usersWithErrors > 0 || usersNotFound > 0) {
      summary.warnings = [];
      if (usersNotFound > 0) {
        summary.warnings.push(`${usersNotFound} user(s) not found`);
      }
      if (usersWithErrors > 0) {
        summary.warnings.push(`${usersWithErrors} user(s) had errors fetching events`);
      }
    }

    return summary;
  }
}

module.exports = GetSharedCalendarViewUseCase;

