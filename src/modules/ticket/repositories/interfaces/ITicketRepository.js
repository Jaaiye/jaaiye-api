/**
 * Ticket Repository Interface
 * Domain layer - repository contract
 */

class ITicketRepository {
  /**
   * Create a new ticket
   * @param {Object} ticketData
   * @returns {Promise<TicketEntity>}
   */
  async create(ticketData) {
    throw new Error('Method not implemented');
  }

  /**
   * Find ticket by ID
   * @param {string} id
   * @param {Object} options - populate options
   * @returns {Promise<TicketEntity|null>}
   */
  async findById(id, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Find tickets by user ID
   * @param {string} userId
   * @param {Object} options - populate, sort options
   * @returns {Promise<TicketEntity[]>}
   */
  async findByUser(userId, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Find tickets by event ID
   * @param {string} eventId
   * @param {Object} options - populate, sort options
   * @returns {Promise<TicketEntity[]>}
   */
  async findByEvent(eventId, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Find active tickets by user ID
   * @param {string} userId
   * @param {Object} options - populate, sort options
   * @returns {Promise<TicketEntity[]>}
   */
  async findActiveByUser(userId, options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Update ticket
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<TicketEntity>}
   */
  async update(id, updates) {
    throw new Error('Method not implemented');
  }

  /**
   * Count tickets by event and ticket type
   * @param {string} eventId
   * @param {string} ticketTypeId
   * @returns {Promise<number>}
   */
  async countByEventAndType(eventId, ticketTypeId) {
    throw new Error('Method not implemented');
  }
}

module.exports = ITicketRepository;

