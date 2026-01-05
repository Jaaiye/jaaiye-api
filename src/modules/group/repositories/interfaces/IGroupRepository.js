/**
 * Group Repository Interface
 * Defines contract for group persistence
 */

class IGroupRepository {
  /**
   * Create group
   * @param {Object} groupData - Group data
   * @returns {Promise<GroupEntity>}
   */
  async create(groupData) {
    throw new Error('Not implemented');
  }

  /**
   * Find group by ID
   * @param {string} id - Group ID
   * @param {Object} options - Populate options
   * @returns {Promise<GroupEntity|null>}
   */
  async findById(id, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Find groups by user
   * @param {string} userId - User ID
   * @param {boolean} includeInactive - Include inactive groups
   * @returns {Promise<GroupEntity[]>}
   */
  async findByUser(userId, includeInactive = false) {
    throw new Error('Not implemented');
  }

  /**
   * Search groups
   * @param {string} searchTerm - Search term
   * @param {string} userId - User ID (must be member)
   * @param {number} limit - Result limit
   * @returns {Promise<GroupEntity[]>}
   */
  async search(searchTerm, userId, limit = 20) {
    throw new Error('Not implemented');
  }

  /**
   * Update group
   * @param {string} id - Group ID
   * @param {Object} updateData - Update data
   * @returns {Promise<GroupEntity>}
   */
  async update(id, updateData) {
    throw new Error('Not implemented');
  }

  /**
   * Delete group (soft delete)
   * @param {string} id - Group ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error('Not implemented');
  }

  /**
   * Add member to group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {string} addedByUserId - User who added
   * @param {string} role - Member role
   * @returns {Promise<GroupEntity>}
   */
  async addMember(groupId, userId, addedByUserId, role = 'member') {
    throw new Error('Not implemented');
  }

  /**
   * Remove member from group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<GroupEntity>}
   */
  async removeMember(groupId, userId) {
    throw new Error('Not implemented');
  }

  /**
   * Update member role
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {string} role - New role
   * @returns {Promise<GroupEntity>}
   */
  async updateMemberRole(groupId, userId, role) {
    throw new Error('Not implemented');
  }

  /**
   * Add event to group
   * @param {string} groupId - Group ID
   * @param {string} eventId - Event ID
   * @returns {Promise<GroupEntity>}
   */
  async addEvent(groupId, eventId) {
    throw new Error('Not implemented');
  }

  /**
   * Create group from event
   * @param {string} eventId - Event ID
   * @param {string} groupName - Group name
   * @param {string} creatorId - Creator ID
   * @returns {Promise<GroupEntity>}
   */
  async createFromEvent(eventId, groupName, creatorId) {
    throw new Error('Not implemented');
  }
}

module.exports = IGroupRepository;

