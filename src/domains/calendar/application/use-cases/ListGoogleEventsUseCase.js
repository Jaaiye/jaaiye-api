/**
 * List Google Events Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../shared/domain/errors');
const { GoogleAccountNotLinkedError } = require('../../domain/errors');
const googleUtils = require('../../../../utils/googleUtils');

class ListGoogleEventsUseCase {
  constructor({ userRepository, googleCalendarAdapter }) {
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Execute list Google events
   * @param {string} userId - User ID
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @param {boolean} includeAllDay - Include all-day events
   * @param {number} maxResults - Max results
   * @param {string} viewType - View type
   * @returns {Promise<Object>} Events list
   */
  async execute(userId, timeMin, timeMax, options = {}) {
    const { includeAllDay = true, maxResults = 100, viewType = 'monthly' } = options;

    if (!timeMin || !timeMax) {
      throw new ValidationError('timeMin and timeMax are required (ISO strings)');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError('No Google account linked. Please link your Google account first.');
    }

    const calendarIds = user.googleCalendar.selectedCalendarIds;
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
      events: enhancedEvents,
      total: enhancedEvents.length,
      timeRange: { start: timeMin, end: timeMax },
      viewType: viewType
    };
  }
}

module.exports = ListGoogleEventsUseCase;

