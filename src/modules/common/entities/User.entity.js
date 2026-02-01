/**
 * User Domain Entity
 * Pure business logic, framework-agnostic
 * Contains business rules and invariants
 */

const { EmailNotVerifiedError, AccountBlockedError, UnauthorizedError } = require('../errors');

class UserEntity {
  constructor({
    id,
    email,
    username,
    fullName,
    password,
    emailVerified = false,
    role = 'user',
    isActive = true,
    isBlocked = false,
    profilePicture,
    preferences = {},
    googleCalendar,
    appleId,
    verification,
    resetPassword,
    refresh,
    friendSettings,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.fullName = fullName;
    this.password = password;
    this.emailVerified = emailVerified;
    this.role = role;
    this.isActive = isActive;
    this.isBlocked = isBlocked;
    this.profilePicture = profilePicture;
    this.preferences = preferences;
    this.googleCalendar = googleCalendar;
    this.appleId = appleId;
    this.verification = verification;
    this.resetPassword = resetPassword;
    this.refresh = refresh;
    this.friendSettings = friendSettings;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Can user login?
   * @throws {EmailNotVerifiedError} If email not verified
   * @throws {AccountBlockedError} If account is blocked
   * @returns {boolean}
   */
  canLogin() {
    if (!this.emailVerified) {
      throw new EmailNotVerifiedError('Please verify your email before logging in');
    }

    if (this.isBlocked) {
      throw new AccountBlockedError('Your account has been blocked. Contact support.');
    }

    if (!this.isActive) {
      throw new AccountBlockedError('Your account is inactive');
    }

    return true;
  }

  /**
   * Business Rule: Is user a scanner?
   * @returns {boolean}
  **/
  isScanner() {
    return ['scanner', 'admin', 'superadmin'].includes(this.role);
  }

  /**
   * Business Rule: Is user an admin?
   * @returns {boolean}
   */
  isAdmin() {
    return ['admin', 'superadmin'].includes(this.role);
  }

  /**
   * Business Rule: Is user a superadmin?
   * @returns {boolean}
   */
  isSuperAdmin() {
    return this.role === 'superadmin';
  }

  /**
   * Business Rule: Can user access admin features?
   * @returns {boolean}
   */
  canAccessAdmin() {
    return this.isAdmin() || this.isSuperAdmin();
  }

  /**
   * Business Rule: Has Google Calendar connected?
   * @returns {boolean}
   */
  hasGoogleCalendar() {
    return !!(this.googleCalendar && this.googleCalendar.refreshToken);
  }

  /**
   * Business Rule: Has Apple ID connected?
   * @returns {boolean}
   */
  hasAppleId() {
    return !!this.appleId;
  }

  /**
   * Business Rule: Is verification code valid?
   * @returns {boolean}
   */
  hasValidVerificationCode() {
    if (!this.verification || !this.verification.code) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('hasValidVerificationCode: verification object missing', {
          hasVerification: !!this.verification,
          hasCode: !!(this.verification && this.verification.code)
        });
      }
      return false;
    }


    if (!this.verification.expires) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('hasValidVerificationCode: expires date missing', {
          verification: this.verification
        });
      }
      return false;
    }

    const { now, isBefore } = require('../../../utils/dateUtils');
    const expiresDate = new Date(this.verification.expires);
    const isValid = isBefore(now(), expiresDate);

    if (process.env.NODE_ENV === 'development') {
      const currentTime = now();
      console.log('hasValidVerificationCode check:', {
        now: currentTime.toISOString(),
        expires: expiresDate.toISOString(),
        isValid,
        timeRemaining: isValid ? Math.floor((expiresDate - currentTime) / 1000 / 60) : 0
      });
    }

    return isValid;
  }

  /**
   * Business Rule: Is reset code valid?
   * @returns {boolean}
   */
  hasValidResetCode() {
    if (!this.resetPassword || !this.resetPassword.code) {
      return false;
    }

    if (!this.resetPassword.expires) {
      return false;
    }

    const { now, isBefore } = require('../../../utils/dateUtils');

    // Ensure expires is a Date object
    const expiresDate = this.resetPassword.expires instanceof Date
      ? this.resetPassword.expires
      : new Date(this.resetPassword.expires);

    const currentTime = now();
    return isBefore(currentTime, expiresDate);
  }

  /**
   * Convert entity to plain object (for responses)
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      emailVerified: this.emailVerified,
      role: this.role,
      isActive: this.isActive,
      profilePicture: this.profilePicture,
      preferences: this.preferences,
      refresh: this.refresh,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to safe public object (no sensitive data)
   * @returns {Object}
   */
  toPublic() {
    return {
      id: this.id,
      username: this.username,
      fullName: this.fullName,
      profilePicture: this.profilePicture
    };
  }
}

module.exports = UserEntity;

