/**
 * Event Participant Repository Interface
 * Defines contract for event participant persistence
 */

class IEventParticipantRepository {
  /**
   * Create participant
   * @param {Object} participantData - Participant data
   * @returns {Promise<EventParticipantEntity>}
   */
  async create(participantData) {
    throw new Error('Not implemented');
  }

  /**
   * Create multiple participants
   * @param {Array} participantsData - Array of participant data
   * @returns {Promise<EventParticipantEntity[]>}
   */
  async createMany(participantsData) {
    throw new Error('Not implemented');
  }

  /**
   * Find participant by ID
   * @param {string} id - Participant ID
   * @returns {Promise<EventParticipantEntity|null>}
   */
  async findById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Find participant by event and user
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<EventParticipantEntity|null>}
   */
  async findByEventAndUser(eventId, userId) {
    throw new Error('Not implemented');
  }

  /**
   * Find participants by event
   * @param {string} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<EventParticipantEntity[]>}
   */
  async findByEvent(eventId, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Find participants by user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<EventParticipantEntity[]>}
   */
  async findByUser(userId, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Update participant
   * @param {string} id - Participant ID
   * @param {Object} updateData - Update data
   * @returns {Promise<EventParticipantEntity>}
   */
  async update(id, updateData) {
    throw new Error('Not implemented');
  }

  /**
   * Delete participant
   * @param {string} id - Participant ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Not implemented');
  }

  /**
   * Delete participant by event and user
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async deleteByEventAndUser(eventId, userId) {
    throw new Error('Not implemented');
  }

  /**
   * Check if user is participant
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async isParticipant(eventId, userId) {
    throw new Error('Not implemented');
  }
}

module.exports = IEventParticipantRepository;

