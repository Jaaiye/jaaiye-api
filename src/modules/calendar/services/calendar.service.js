/**
 * Calendar Service
 * Domain service - aggregates calendar operations
 */

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
   * Get unified calendar (combines Jaaiye and Google events)
   * @param {string} userId
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @param {Object} options - { includeJaaiye, includeGoogle, viewType }
   * @returns {Promise<Object>}
   */
  async getUnifiedCalendar(userId, timeMin, timeMax, options = {}) {
    const { includeJaaiye = true, includeGoogle = true, viewType = 'monthly' } = options;
    const events = [];

    // Get Jaaiye events
    if (includeJaaiye) {
      const calendars = await this.calendarRepository.findAccessibleByUser(userId);
      const calendarIds = calendars.map(c => c.id);

      const jaaiyeEvents = await this.eventRepository.find({
        calendar: { $in: calendarIds },
        startTime: { $gte: new Date(timeMin), $lte: new Date(timeMax) }
      }, {
        limit: 1000,
        sort: { startTime: 1 }
      });

      events.push(...(jaaiyeEvents.events || []).map(e => ({
        ...e,
        source: 'jaaiye'
      })));
    }

    // Get Google events
    let googleCalendarLinked = false;
    if (includeGoogle) {
      try {
        const user = await this.userRepository.findById(userId);
        if (user && user.googleCalendar && user.googleCalendar.refreshToken) {
          googleCalendarLinked = true;
          // Use selectedCalendarIds - if empty, user doesn't want to share calendar
          const selectedCalendarIds = user.googleCalendar.selectedCalendarIds || [];
          if (selectedCalendarIds.length > 0) {
            const googleEvents = await this.googleCalendarAdapter.listEvents(
              user,
              timeMin,
              timeMax,
              selectedCalendarIds
            );
            events.push(...(googleEvents || []).map(e => ({
              ...e,
              source: 'google'
            })));
          }
          // If selectedCalendarIds is empty, return no Google events (user doesn't want to share)
        }
      } catch (error) {
        // Silently fail if Google Calendar not linked or error occurs
        googleCalendarLinked = false;
      }
    }

    // Sort by start time
    events.sort((a, b) => {
      const aTime = new Date(a.startTime || a.start?.dateTime || a.start?.date);
      const bTime = new Date(b.startTime || b.start?.dateTime || b.start?.date);
      return aTime - bTime;
    });

    return {
      events,
      viewType,
      timeRange: { timeMin, timeMax },
      googleCalendarLinked,
      ...(includeGoogle && !googleCalendarLinked ? {
        message: 'Google Calendar is not linked. Please link your Google account to view Google Calendar events.'
      } : {})
    };
  }

  /**
   * Get monthly calendar grid
   * @param {string} userId
   * @param {number} year
   * @param {number} month
   * @param {Object} options - { includeJaaiye, includeGoogle }
   * @returns {Promise<Object>}
   */
  async getMonthlyCalendarGrid(userId, year, month, options = {}) {
    const { includeJaaiye = true, includeGoogle = true } = options;

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();

    const unifiedData = await this.getUnifiedCalendar(userId, timeMin, timeMax, {
      includeJaaiye,
      includeGoogle,
      viewType: 'monthly'
    });

    // Build calendar grid
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const grid = [];
    let currentWeek = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayEvents = unifiedData.events.filter(e => {
        const eventDate = new Date(e.startTime || e.start?.dateTime || e.start?.date);
        return eventDate.getDate() === day &&
               eventDate.getMonth() === month - 1 &&
               eventDate.getFullYear() === year;
      });

      currentWeek.push({
        day,
        date: date.toISOString(),
        events: dayEvents
      });

      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add empty cells for remaining days in last week
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      grid.push(currentWeek);
    }

    return {
      year,
      month,
      grid,
      totalEvents: unifiedData.events.length
    };
  }
}

module.exports = CalendarService;

