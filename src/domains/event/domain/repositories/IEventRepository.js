/**
 * Event Repository Interface
 * Defines contract for event persistence
 */

class IEventRepository {
  /**
   * Create event
   * @param {Object} eventData - Event data
   * @returns {Promise<EventEntity>}
   */
  async create(eventData) {
    throw new Error('Not implemented');
  }

  /**
   * Find event by ID
   * @param {string} id - Event ID
   * @returns {Promise<EventEntity|null>}
   */
  async findById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Find event by slug
   * @param {string} slug - Event slug
   * @returns {Promise<EventEntity|null>}
   */
  async findBySlug(slug) {
    throw new Error('Not implemented');
  }

  /**
   * Find events by filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options (limit, skip, sort)
   * @returns {Promise<{events: EventEntity[], total: number}>}
   */
  async find(filters, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Update event
   * @param {string} id - Event ID
   * @param {Object} updateData - Update data
   * @returns {Promise<EventEntity>}
   */
  async update(id, updateData) {
    throw new Error('Not implemented');
  }

  /**
   * Delete event
   * @param {string} id - Event ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Not implemented');
  }

  /**
   * Add ticket type to event
   * @param {string} eventId - Event ID
   * @param {Object} ticketTypeData - Ticket type data
   * @returns {Promise<EventEntity>}
   */
  async addTicketType(eventId, ticketTypeData) {
    throw new Error('Not implemented');
  }

  /**
   * Update ticket type
   * @param {string} eventId - Event ID
   * @param {string} ticketTypeId - Ticket type ID
   * @param {Object} updateData - Update data
   * @returns {Promise<EventEntity>}
   */
  async updateTicketType(eventId, ticketTypeId, updateData) {
    throw new Error('Not implemented');
  }

  /**
   * Remove ticket type
   * @param {string} eventId - Event ID
   * @param {string} ticketTypeId - Ticket type ID
   * @returns {Promise<EventEntity>}
   */
  async removeTicketType(eventId, ticketTypeId) {
    throw new Error('Not implemented');
  }
}

module.exports = IEventRepository;

