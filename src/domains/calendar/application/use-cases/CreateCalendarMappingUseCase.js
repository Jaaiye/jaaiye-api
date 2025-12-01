/**
 * Create Calendar Mapping Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../shared/domain/errors');
const calendarUtils = require('../../../../utils/calendarUtils');

class CreateCalendarMappingUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute create calendar mapping
   * @param {string} userId - User ID
   * @param {string} googleCalendarId - Google calendar ID
   * @param {string} jaaiyeCalendarId - Jaaiye calendar ID
   * @returns {Promise<Object>} Mappings
   */
  async execute(userId, googleCalendarId, jaaiyeCalendarId) {
    if (!googleCalendarId || !jaaiyeCalendarId) {
      throw new ValidationError('googleCalendarId and jaaiyeCalendarId are required');
    }

    const mappings = await calendarUtils.mapGoogleToJaaiyeCalendar(
      googleCalendarId,
      jaaiyeCalendarId,
      userId
    );

    return { mappings };
  }
}

module.exports = CreateCalendarMappingUseCase;

