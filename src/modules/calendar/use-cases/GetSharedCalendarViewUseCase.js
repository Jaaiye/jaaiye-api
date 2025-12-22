/**
 * Get Shared Calendar View Use Case
 * Application layer - use case
 * Fetches Google Calendar events for multiple users, grouped by user
 */

const { ValidationError } = require('../errors');
const googleUtils = require('../../../utils/googleUtils');

class GetSharedCalendarViewUseCase {
  constructor({ userRepository, calendarRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.calendarRepository = calendarRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
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

        // Get user's calendar to find Google Calendar linkedIds
        const calendar = await this.calendarRepository.findByOwner(userId);
        if (!calendar || !calendar.google || !calendar.google.linkedIds || calendar.google.linkedIds.length === 0) {
          // User has no Google calendars linked - return empty events
          return {
            userId: user.id,
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              profilePicture: user.profilePicture
            },
            events: [],
            totalEvents: 0
          };
        }

        // Check if user has Google account linked
        if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
          // User has no Google account linked - return empty events
          return {
            userId: user.id,
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              profilePicture: user.profilePicture
            },
            events: [],
            totalEvents: 0
          };
        }

        // Fetch Google events for this user's linked calendar IDs
        const calendarIds = calendar.google.linkedIds;
        const events = await this.googleCalendarAdapter.listEvents(user, timeMin, timeMax, calendarIds);

        // Get calendar information for event enhancement
        const calendars = await this.googleCalendarAdapter.listCalendars(user);
        const formattedCalendars = googleUtils.formatGoogleCalendarData(calendars);

        // Enhance events with calendar information
        const enhancedEvents = events.map(event => {
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

        return {
          userId: user.id,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            profilePicture: user.profilePicture
          },
          events: enhancedEvents,
          totalEvents: enhancedEvents.length
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

