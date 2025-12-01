/**
 * Notification Repository Interface
 * Defines contract for notification persistence
 */

class INotificationRepository {
  /**
   * Create notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<NotificationEntity>}
   */
  async create(notificationData) {
    throw new Error('Not implemented');
  }

  /**
   * Find notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<NotificationEntity|null>}
   */
  async findById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Find notifications by user
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options (limit, skip, sort)
   * @returns {Promise<{notifications: NotificationEntity[], total: number}>}
   */
  async findByUser(userId, filters = {}, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Update notification
   * @param {string} id - Notification ID
   * @param {Object} updateData - Update data
   * @returns {Promise<NotificationEntity>}
   */
  async update(id, updateData) {
    throw new Error('Not implemented');
  }

  /**
   * Update many notifications
   * @param {Object} filter - Filter criteria
   * @param {Object} updateData - Update data
   * @returns {Promise<number>} Number of modified documents
   */
  async updateMany(filter, updateData) {
    throw new Error('Not implemented');
  }

  /**
   * Delete notification
   * @param {string} id - Notification ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Not implemented');
  }

  /**
   * Delete many notifications
   * @param {Object} filter - Filter criteria
   * @returns {Promise<number>} Number of deleted documents
   */
  async deleteMany(filter) {
    throw new Error('Not implemented');
  }
}

module.exports = INotificationRepository;

