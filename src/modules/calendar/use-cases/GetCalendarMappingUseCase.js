/**
 * Get Calendar Mapping Use Case
 * Application layer - use case
 */

const calendarUtils = require('../../../utils/calendarUtils');

class GetCalendarMappingUseCase {
  /**
   * Execute get calendar mappings
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Mappings
   */
  async execute(userId) {
    const mappings = await calendarUtils.getCalendarMappings(userId);
    return { mappings };
  }
}

module.exports = GetCalendarMappingUseCase;

