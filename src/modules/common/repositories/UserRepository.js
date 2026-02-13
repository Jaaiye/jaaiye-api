/**
 * User Repository Implementation
 * Implements IUserRepository interface
 * Infrastructure layer - persistence
 */

const IUserRepository = require('./interfaces/IUserRepository');
const UserSchema = require('../entities/User.schema');
const UserEntity = require('../entities/User.entity');
const TokenBlacklist = require('../../common/entities/TokenBlacklist.schema');

class UserRepository extends IUserRepository {
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<UserEntity|null>}
   */
  async findById(id) {
    // Explicitly select password and ensure refresh object is included
    // Using lean() to get plain object and avoid transform issues, then convert back
    const userDoc = await UserSchema.findById(id)
      .select('+password +googleCalendar.googleId +googleCalendar.refreshToken')
      .lean(false); // Keep as Mongoose document to preserve all fields

    if (!userDoc) return null;

    return this._toEntity(userDoc);
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<UserEntity|null>}
   */
  async findByEmail(email) {
    const user = await UserSchema.findOne({ email: email.toLowerCase() }).select('+password +googleCalendar.googleId +googleCalendar.refreshToken');
    return user ? this._toEntity(user) : null;
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<UserEntity|null>}
   */
  async findByUsername(username) {
    const user = await UserSchema.findOne({ username }).select('+password +googleCalendar.googleId +googleCalendar.refreshToken');
    return user ? this._toEntity(user) : null;
  }

  /**
   * Find user by Google ID
   * @param {string} googleId - Google OAuth sub
   * @returns {Promise<UserEntity|null>}
   */
  async findByGoogleId(googleId) {
    const user = await UserSchema.findOne({ 'googleCalendar.googleId': googleId }).select('+password +googleCalendar.googleId +googleCalendar.refreshToken');
    return user ? this._toEntity(user) : null;
  }

  /**
   * Find user by Apple ID
   * @param {string} appleId - Apple ID
   * @returns {Promise<UserEntity|null>}
   */
  async findByAppleId(appleId) {
    const user = await UserSchema.findOne({ appleId }).select('+password +googleCalendar.googleId +googleCalendar.refreshToken');
    return user ? this._toEntity(user) : null;
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<UserEntity>}
   */
  async create(userData) {
    const user = await UserSchema.create(userData);
    // Select verification fields if they exist in userData
    const selectFields = '+password +googleCalendar.googleId +googleCalendar.refreshToken';
    const verificationSelect = (userData.verification && (userData.verification.code || userData.verification.expires))
      ? ' +verification.code +verification.expires'
      : '';
    const userWithAllFields = await UserSchema.findById(user._id)
      .select(selectFields + verificationSelect)
      .lean(false); // Keep as Mongoose document to preserve all fields

    return this._toEntity(userWithAllFields);
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<UserEntity>}
   */
  async update(id, updates) {
    const user = await UserSchema.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('+password +googleCalendar.googleId +googleCalendar.refreshToken');

    return this._toEntity(user);
  }

  /**
   * Update refresh token data (optimized path)
   * @param {string} id - User ID
   * @param {Object} data - Refresh payload
   * @returns {Promise<void>}
   */
  async updateRefreshData(id, { refreshToken, firebaseToken, refreshExpiry }) {
    await UserSchema.updateOne(
      { _id: id },
      {
        $set: {
          'refresh.token': refreshToken,
          'refresh.firebaseToken': firebaseToken ?? null,
          'refresh.expiresAt': refreshExpiry,
          lastLogin: new Date()
        }
      }
    );
  }

  /**
   * Update Firebase token only
   * @param {string} id - User ID
   * @param {string|null} firebaseToken - Firebase token
   * @returns {Promise<void>}
   */
  async updateFirebaseToken(id, firebaseToken) {
    await UserSchema.updateOne(
      { _id: id },
      {
        $set: {
          'refresh.firebaseToken': firebaseToken ?? null,
          lastLogin: new Date()
        }
      }
    );
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    await UserSchema.findByIdAndDelete(id);
  }

  /**
   * Revoke all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async revokeAllSessions(userId) {
    // Select the refresh token fields specifically
    const userDoc = await UserSchema.findById(userId).select('+refresh.token +refresh.expiresAt');

    if (userDoc?.refresh?.token) {
      // Blacklist the existing token
      await TokenBlacklist.create({
        token: userDoc.refresh.token,
        expiresAt: userDoc.refresh.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });

      // Wipe the token from the user record
      userDoc.refresh.token = undefined;
      userDoc.refresh.expiresAt = undefined;
      await userDoc.save();
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email address
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    const count = await UserSchema.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  /**
   * Check if username exists
   * @param {string} username - Username
   * @returns {Promise<boolean>}
   */
  async usernameExists(username) {
    const count = await UserSchema.countDocuments({ username });
    return count > 0;
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @returns {Promise<UserEntity[]>}
   */
  async findByRole(role) {
    const users = await UserSchema.find({ role }).select('+password +googleCalendar.googleId +googleCalendar.refreshToken');
    return users.map(user => this._toEntity(user));
  }

  /**
   * Set verification code
   * @param {string} userId - User ID
   * @param {string} code - Verification code
   * @param {Date} expires - Expiration date
   * @returns {Promise<void>}
   */
  async setVerificationCode(userId, code, expires) {
    await UserSchema.findByIdAndUpdate(userId, {
      $set: {
        'verification.code': code,
        'verification.expires': expires
      }
    });
  }

  /**
   * Set reset password code
   * @param {string} userId - User ID
   * @param {string} code - Reset code
   * @param {Date} expires - Expiration date
   * @returns {Promise<void>}
   */
  async setResetPasswordCode(userId, code, expires) {
    // Ensure expires is a proper Date object
    const expiresDate = expires instanceof Date ? expires : new Date(expires);

    await UserSchema.findByIdAndUpdate(
      userId,
      {
        $set: {
          'resetPassword.code': code,
          'resetPassword.expires': expiresDate
        }
      }
    );
  }

  /**
   * Mark email as verified
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async markEmailVerified(userId) {
    await UserSchema.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerified: true
        },
        $unset: {
          verification: ''
        }
      }
    );
  }

  /**
   * Update password
   * @param {string} userId - User ID
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<void>}
   */
  async updatePassword(userId, hashedPassword) {
    await UserSchema.findByIdAndUpdate(userId, {
      $set: {
        password: hashedPassword
      },
      $unset: {
        resetPassword: ''
      }
    });
  }

  /**
   * Link Google account
   * @param {string} userId - User ID
   * @param {Object} googleData - Google calendar data
   * @returns {Promise<void>}
   */
  async linkGoogleAccount(userId, googleData) {
    await UserSchema.findByIdAndUpdate(userId, {
      $set: {
        googleCalendar: googleData
      }
    });
  }

  /**
   * Unlink Google account
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async unlinkGoogleAccount(userId) {
    await UserSchema.findByIdAndUpdate(userId, {
      $unset: {
        googleCalendar: ''
      }
    });
  }

  /**
   * Find user by ID with verification fields
   * @param {string} id - User ID
   * @returns {Promise<UserEntity|null>}
   */
  async findByIdWithVerification(id) {
    const userDoc = await UserSchema.findById(id)
      .select('+password +verification +googleCalendar.googleId +googleCalendar.refreshToken')
      .lean(false);

    if (!userDoc) return null;

    return this._toEntity(userDoc);
  }

  /**
   * Find user by verification code
   * @param {string} code - Verification code
   * @returns {Promise<UserEntity|null>}
   */
  async findByVerificationCode(code) {
    // Explicitly select verification subfields since they have select: false
    const user = await UserSchema.findOne({ 'verification.code': code })
      .select('+password +verification.code +verification.expires +googleCalendar.googleId +googleCalendar.refreshToken')
      .lean(false); // Keep as Mongoose document to preserve all fields

    if (!user) return null;

    // Debug: Log raw document verification data
    if (process.env.NODE_ENV === 'development') {
      const rawDoc = user.toObject ? user.toObject() : user;
      console.log('findByVerificationCode - Raw document verification:', {
        hasVerification: !!rawDoc.verification,
        verification: rawDoc.verification,
        verificationType: typeof rawDoc.verification
      });
    }

    return this._toEntity(user);
  }

  /**
   * Find user by reset password code
   * @param {string} code - Reset code
   * @returns {Promise<UserEntity|null>}
   */
  async findByResetCode(code) {
    // CRITICAL: Mongoose nested fields with select: false require explicit selection
    // Use the same pattern as findByVerificationCode which works
    // IMPORTANT: When querying by nested field, Mongoose may not return the nested object properly
    // So we query by the code, then explicitly select the nested fields

    // First, find the user ID by code (this will work even if resetPassword isn't selected)
    const userWithCode = await UserSchema.findOne({ 'resetPassword.code': code })
      .select('_id resetPassword.code')
      .lean();

    if (!userWithCode) return null;

    // Now fetch the full user with explicit selection of nested fields
    const user = await UserSchema.findById(userWithCode._id)
      .select('+password +resetPassword.code +resetPassword.expires +googleCalendar.googleId +googleCalendar.refreshToken')
      .lean(false); // Keep as Mongoose document to preserve Date objects

    if (!user) return null;

    return this._toEntity(user);
  }

  /**
   * Get raw user document (for accessing select: false fields)
   * @param {string} id - User ID
   * @param {string} select - Fields to select
   * @returns {Promise<Object|null>}
   */
  async _getRawUser(id, select = '+googleCalendar.refreshToken') {
    return await UserSchema.findById(id).select(select);
  }

  /**
   * Find user by ID with ICS token
   * @param {string} id - User ID
   * @returns {Promise<UserEntity|null>}
   */
  async findByIdWithICSToken(id) {
    const user = await UserSchema.findById(id).select('+ics.token +googleCalendar.googleId +googleCalendar.refreshToken');
    return user ? this._toEntity(user) : null;
  }

  /**
   * Find user by Google Calendar resource ID
   * @param {string} resourceId - Google Calendar resource ID
   * @returns {Promise<UserEntity|null>}
   */
  async findByGoogleCalendarResourceId(resourceId) {
    const user = await UserSchema.findOne({ 'googleCalendar.calendars.resourceId': resourceId }).select('+googleCalendar.googleId +googleCalendar.refreshToken');
    return user ? this._toEntity(user) : null;
  }

  /**
   * Set ICS token
   * @param {string} userId - User ID
   * @param {string} token - ICS token
   * @returns {Promise<void>}
   */
  async setICSToken(userId, token) {
    await UserSchema.findByIdAndUpdate(userId, {
      $set: {
        'ics.token': token
      }
    });
  }

  /**
   * Convert Mongoose document to domain entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;

    // Use toObject to convert Mongoose document to plain object
    // Include all fields, especially those with select: false
    const obj = doc.toObject
      ? doc.toObject({
        virtuals: true,
        getters: false,
        transform: false,
        flattenMaps: false // Preserve nested objects
      })
      : doc;

    // Debug: Log verification data if present (development only)
    if (process.env.NODE_ENV === 'development' && obj.verification !== undefined) {
      console.log('_toEntity - Verification data:', {
        hasVerification: !!obj.verification,
        verification: obj.verification,
        verificationType: typeof obj.verification,
        hasCode: !!(obj.verification && obj.verification.code),
        hasExpires: !!(obj.verification && obj.verification.expires)
      });
    }


    return new UserEntity({
      id: obj._id?.toString() || obj.id,
      email: obj.email,
      username: obj.username,
      fullName: obj.fullName,
      password: obj.password,
      emailVerified: obj.emailVerified,
      role: obj.role,
      isActive: obj.isActive,
      isBlocked: obj.isBlocked,
      profilePicture: obj.profilePicture,
      isGuest: obj.isGuest,
      preferences: obj.preferences,
      googleCalendar: obj.googleCalendar,
      appleId: obj.appleId,
      verification: obj.verification, // Will be undefined if not selected or empty
      resetPassword: obj.resetPassword,
      refresh: obj.refresh,
      friendSettings: obj.friendSettings,
      ics: obj.ics,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt
    });
  }
}

module.exports = UserRepository;

