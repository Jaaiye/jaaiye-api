/**
 * Firebase Adapter for Group Domain
 * Infrastructure layer - external services
 * Wraps shared FirebaseAdapter for Firestore operations
 */

const SharedFirebaseAdapter = require('../../../shared/infrastructure/adapters/FirebaseAdapter');

class FirebaseAdapter {
  constructor() {
    this.firebaseAdapter = new SharedFirebaseAdapter();
  }

  /**
   * Create group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} groupData - Group data
   * @returns {Promise<Object>}
   */
  async createGroup(groupId, groupData) {
    return this.firebaseAdapter.createGroup(groupId, groupData);
  }

  /**
   * Get group snapshot from Firestore
   * @param {string} groupId - Group ID
   * @returns {Promise<Object|null>}
   */
  async getGroupSnapshot(groupId) {
    return this.firebaseAdapter.getGroupSnapshot(groupId);
  }

  /**
   * Update group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} updates - Update data
   * @returns {Promise<void>}
   */
  async updateGroup(groupId, updates) {
    return this.firebaseAdapter.updateGroup(groupId, updates);
  }

  /**
   * Delete group from Firestore
   * @param {string} groupId - Group ID
   * @returns {Promise<void>}
   */
  async deleteGroup(groupId) {
    return this.firebaseAdapter.deleteGroup(groupId);
  }

  /**
   * Add member to group in Firestore
   * @param {string} groupId - Group ID
   * @param {Object} memberData - Member data
   * @returns {Promise<void>}
   */
  async addMember(groupId, memberData) {
    return this.firebaseAdapter.addMember(groupId, memberData);
  }

  /**
   * Remove member from group in Firestore
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @returns {Promise<void>}
   */
  async removeMember(groupId, memberId) {
    return this.firebaseAdapter.removeMember(groupId, memberId);
  }
}

module.exports = FirebaseAdapter;

