/**
 * Sync Calendar Use Case
 * Application layer - use case
 */

class SyncCalendarUseCase {
  constructor({ calendarSyncAdapter }) {
    this.calendarSyncAdapter = calendarSyncAdapter;
  }

  /**
   * Execute sync calendar
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sync result
   */
  async execute(userId) {
    if (!this.calendarSyncAdapter) {
      throw new Error('Calendar sync adapter not available');
    }

    const syncResult = await this.calendarSyncAdapter.syncExistingEventsToCalendar(userId);
    return syncResult;
  }
}

module.exports = SyncCalendarUseCase;

