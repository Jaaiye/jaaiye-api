/**
 * Calendar Service
 * Infrastructure layer - unified calendar operations
 * Combines Jaaiye and Google Calendar events
 */

const calendarUtils = require('../../../../utils/calendarUtils');
const eventUtils = require('../../../../utils/eventUtils');
const logger = require('../../../../utils/logger');

class CalendarService {
  constructor({
    userRepository,
    calendarRepository,
    eventRepository,
    googleCalendarAdapter
  }) {
    this.userRepository = userRepository;
    this.calendarRepository = calendarRepository;
    this.eventRepository = eventRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  /**
   * Get unified calendar data combining Jaaiye and Google Calendar events
   */
  async getUnifiedCalendar(userId, timeMin, timeMax, options = {}) {
    try {
      const {
        includeJaaiye = true,
        includeGoogle = true,
        viewType = 'monthly',
        includeAllDay = true,
        maxResults = 100
      } = options;

      // Validate time range
      const { start, end } = calendarUtils.validateTimeRange(timeMin, timeMax);

      const allEvents = [];

      // 1. Get Jaaiye calendar events
      if (includeJaaiye) {
        try {
          const jaaiyeEvents = await calendarUtils.getJaaiyeEvents(
            userId,
            start.toISOString(),
            end.toISOString(),
            { includeAllDay, maxResults }
          );

          const enhancedJaaiyeEvents = eventUtils.enhanceJaaiyeEvents(jaaiyeEvents);
          allEvents.push(...enhancedJaaiyeEvents);

          logger.info('Jaaiye events retrieved for unified calendar', {
            userId, count: jaaiyeEvents.length
          });
        } catch (error) {
          logger.error('Failed to get Jaaiye events for unified calendar', {
            userId, error: error.message
          });
          // Continue with Google events if Jaaiye fails
        }
      }

      // 2. Get Google Calendar events
      if (includeGoogle) {
        try {
          const user = await this.userRepository.findById(userId);

          if (user?.googleCalendar?.refreshToken) {
            const googleEvents = await this.googleCalendarAdapter.listEvents(
              user,
              null, // All calendars
              {
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                includeAllDay,
                maxResults
              }
            );

            const enhancedGoogleEvents = eventUtils.enhanceGoogleEvents(googleEvents);
            allEvents.push(...enhancedGoogleEvents);

            logger.info('Google events retrieved for unified calendar', {
              userId, count: googleEvents.length
            });
          } else {
            logger.info('Google Calendar not linked for user', { userId });
          }
        } catch (error) {
          logger.error('Failed to get Google events for unified calendar', {
            userId, error: error.message
          });
          // Continue with Jaaiye events if Google fails
        }
      }

      // 3. Merge and deduplicate events
      const mergedEvents = eventUtils.mergeEvents(allEvents);
      const uniqueEvents = eventUtils.deduplicateEvents(mergedEvents);

      // 4. Create unified calendar data based on view type
      let calendarData;
      if (viewType === 'monthly') {
        calendarData = calendarUtils.groupEventsByMonth(uniqueEvents, timeMin, timeMax);
      } else {
        calendarData = { events: uniqueEvents };
      }

      logger.info('Unified calendar data created successfully', {
        userId,
        totalEvents: uniqueEvents.length,
        viewType,
        sources: { jaaiye: includeJaaiye, google: includeGoogle }
      });

      return {
        ...calendarData,
        total: uniqueEvents.length,
        timeRange: { start: timeMin, end: timeMax },
        viewType: viewType,
        sources: {
          jaaiye: includeJaaiye,
          google: includeGoogle
        }
      };
    } catch (error) {
      logger.error('Failed to get unified calendar', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get monthly calendar grid view
   */
  async getMonthlyCalendarGrid(userId, year, month, options = {}) {
    try {
      const { includeJaaiye = true, includeGoogle = true } = options;

      // Calculate time range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get unified calendar data for the month
      const calendarData = await this.getUnifiedCalendar(
        userId,
        startDate.toISOString(),
        endDate.toISOString(),
        { includeJaaiye, includeGoogle, viewType: 'list' }
      );

      // Create monthly grid
      const monthlyGrid = calendarUtils.createMonthlyCalendarGrid(year, month, calendarData.events);

      logger.info('Monthly calendar grid created', {
        userId, year, month, eventCount: calendarData.events.length
      });

      return monthlyGrid;
    } catch (error) {
      logger.error('Failed to get monthly calendar grid', {
        userId, year, month, error: error.message
      });
      throw error;
    }
  }
}

module.exports = CalendarService;


