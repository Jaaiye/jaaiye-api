/**
 * Calendar Sync Service
 * Handles syncing events to user calendars (Jaaiye + Google)
 * Non-blocking with retry mechanism
 */

class CalendarSyncService {
  constructor({
    eventParticipantRepository,
    calendarRepository,
    userRepository,
    googleCalendarAdapter
  }) {
    this.eventParticipantRepository = eventParticipantRepository;
    this.calendarRepository = calendarRepository;
    this.userRepository = userRepository;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.retryQueue = new Map(); // Store failed syncs for retry
  }

  /**
   * Sync event to user's calendars (Jaaiye + Google)
   * Non-blocking - runs in background
   * @param {string} userId - User ID
   * @param {Object} event - Event entity/document
   * @param {Object} options - { skipGoogle, retryCount }
   */
  async syncEventToUserCalendars(userId, event, options = {}) {
    const { skipGoogle = false, retryCount = 0 } = options;

    // Run in background (non-blocking)
    setImmediate(async () => {
      try {
        await this._syncToJaaiyeCalendar(userId, event);

        if (!skipGoogle) {
          await this._syncToGoogleCalendar(userId, event);
        }
      } catch (error) {
        console.error('[CalendarSync] Failed to sync event to user calendars:', {
          userId,
          eventId: event.id || event._id,
          error: error.message,
          retryCount
        });

        // Retry logic (max 3 retries)
        if (retryCount < 3) {
          const retryKey = `${userId}-${event.id || event._id}`;
          const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s

          setTimeout(() => {
            this.syncEventToUserCalendars(userId, event, {
              skipGoogle,
              retryCount: retryCount + 1
            });
          }, retryDelay);
        } else {
          console.error('[CalendarSync] Max retries reached, giving up:', {
            userId,
            eventId: event.id || event._id
          });
        }
      }
    });
  }

  /**
   * Sync to Jaaiye calendar (by ensuring participant record exists)
   * Participants automatically show in unified calendar view
   * @private
   */
  async _syncToJaaiyeCalendar(userId, event) {
    try {
      // Check if user has a calendar
      const userCalendar = await this.calendarRepository.findByOwner(userId);
      if (!userCalendar) {
        console.warn('[CalendarSync] User has no Jaaiye calendar, skipping Jaaiye sync:', userId);
        return;
      }

      // Check if already a participant
      const existingParticipant = await this.eventParticipantRepository.findByEventAndUser(
        event.id || event._id,
        userId
      );

      if (!existingParticipant) {
        // Add as participant - this makes event show in their unified calendar
        await this.eventParticipantRepository.create({
          event: event.id || event._id,
          user: userId,
          role: 'attendee',
          status: 'accepted'
        });

        console.log('[CalendarSync] Added user as participant (Jaaiye calendar sync):', {
          userId,
          eventId: event.id || event._id
        });
      }
    } catch (error) {
      // If participant already exists, that's fine - just log and continue
      if (error.message && error.message.includes('duplicate') || error.message.includes('already')) {
        console.log('[CalendarSync] User already participant, skipping:', userId);
        return;
      }
      throw error;
    }
  }

  /**
   * Sync to Google Calendar
   * @private
   */
  async _syncToGoogleCalendar(userId, event) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        console.warn('[CalendarSync] User not found for Google sync:', userId);
        return;
      }

      // Check if user has Google account linked
      if (!user.providerLinks?.google || !user.googleCalendar?.refreshToken) {
        console.log('[CalendarSync] User has no Google account linked, skipping Google sync:', userId);
        return;
      }

      // Check if event already synced to Google
      if (event.external?.google?.eventId) {
        console.log('[CalendarSync] Event already synced to Google, skipping:', {
          userId,
          eventId: event.id || event._id
        });
        return;
      }

      // Prepare event body
      const eventBody = {
        summary: event.title,
        description: event.description || `You're attending: ${event.title}`,
        start: { dateTime: new Date(event.startTime).toISOString() },
        end: { dateTime: new Date(event.endTime || event.startTime).toISOString() },
        location: event.venue || undefined
      };

      // Get user's calendar to find target Google calendar ID
      const userCalendar = await this.calendarRepository.findByOwner(userId);
      const targetGoogleCalId = userCalendar?.google?.primaryId || user.googleCalendar?.jaaiyeCalendarId;

      if (!targetGoogleCalId) {
        console.warn('[CalendarSync] No target Google calendar ID found, skipping Google sync:', userId);
        return;
      }

      // Insert into Google Calendar
      const googleEvent = await this.googleCalendarAdapter.insertEvent(user, eventBody, targetGoogleCalId);

      // Update event with Google sync info (only for creator's sync, not participants)
      // For participants, we don't update the main event's external.google
      // Each participant's sync is independent

      console.log('[CalendarSync] Synced event to Google Calendar:', {
        userId,
        eventId: event.id || event._id,
        googleEventId: googleEvent.id
      });
    } catch (error) {
      // Check for invalid_grant error - don't retry, account needs re-linking
      const isInvalidGrant = error.name === 'GoogleRefreshTokenInvalidError' ||
                            error.message?.toLowerCase().includes('invalid_grant') ||
                            error.code === 'invalid_grant';

      if (isInvalidGrant) {
        console.warn('[CalendarSync] Google refresh token invalid, skipping Google sync:', {
          userId,
          eventId: event.id || event._id
        });
        // Don't throw - gracefully skip Google sync
        return;
      }

      // Don't throw - log and continue
      console.error('[CalendarSync] Google sync failed:', {
        userId,
        eventId: event.id || event._id,
        error: error.message
      });
      throw error; // Re-throw for retry mechanism (non-invalid_grant errors)
    }
  }

  /**
   * Sync event to multiple users' calendars
   * @param {string[]} userIds - Array of user IDs
   * @param {Object} event - Event entity/document
   * @param {Object} options - { skipGoogle }
   */
  async syncEventToMultipleUsers(userIds, event, options = {}) {
    await Promise.all(
      userIds.map(userId =>
        this.syncEventToUserCalendars(userId, event, options)
      )
    );
  }
}

module.exports = CalendarSyncService;

