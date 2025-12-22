/**
 * User Repository Interface (Port)
 * Defines contract for user persistence
 * Infrastructure layer must implement this
 */

class IUserRepository {
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<UserEntity|null>}
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<UserEntity|null>}
   */
  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<UserEntity|null>}
   */
  async findByUsername(username) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by Google ID
   * @param {string} googleId - Google OAuth sub
   * @returns {Promise<UserEntity|null>}
   */
  async findByGoogleId(googleId) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by Apple ID
   * @param {string} appleId - Apple ID
   * @returns {Promise<UserEntity|null>}
   */
  async findByAppleId(appleId) {
    throw new Error('Method not implemented');
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<UserEntity>}
   */
  async create(userData) {
    throw new Error('Method not implemented');
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<UserEntity>}
   */
  async update(id, updates) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if email exists
   * @param {string} email - Email address
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if username exists
   * @param {string} username - Username
   * @returns {Promise<boolean>}
   */
  async usernameExists(username) {
    throw new Error('Method not implemented');
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @returns {Promise<UserEntity[]>}
   */
  async findByRole(role) {
    throw new Error('Method not implemented');
  }

  /**
   * Set verification code
   * @param {string} userId - User ID
   * @param {string} code - Verification code
   * @param {Date} expires - Expiration date
   * @returns {Promise<void>}
   */
  async setVerificationCode(userId, code, expires) {
    throw new Error('Method not implemented');
  }

  /**
   * Set reset password code
   * @param {string} userId - User ID
   * @param {string} code - Reset code
   * @param {Date} expires - Expiration date
   * @returns {Promise<void>}
   */
  async setResetPasswordCode(userId, code, expires) {
    throw new Error('Method not implemented');
  }

  /**
   * Mark email as verified
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async markEmailVerified(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Update password
   * @param {string} userId - User ID
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<void>}
   */
  async updatePassword(userId, hashedPassword) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by verification code
   * @param {string} code - Verification code
   * @returns {Promise<UserEntity[]>}
   */
  async findByVerificationCode(code) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by reset password code
   * @param {string} code - Reset code
   * @returns {Promise<UserEntity|null>}
   */
  async findByResetCode(code) {
    throw new Error('Method not implemented');
  }

  /**
   * Link Google account
   * @param {string} userId - User ID
   * @param {Object} googleData - Google calendar data
   * @returns {Promise<void>}
   */
  async linkGoogleAccount(userId, googleData) {
    throw new Error('Method not implemented');
  }

  /**
   * Unlink Google account
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async unlinkGoogleAccount(userId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IUserRepository;

