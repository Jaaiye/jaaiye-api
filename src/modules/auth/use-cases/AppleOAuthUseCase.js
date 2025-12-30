/**
 * Apple OAuth Use Case
 * Handles Apple Sign In login/register
 */

const { ValidationError } = require('../errors');
const { AppleOAuthService } = require('../services');
const { TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');

class AppleOAuthUseCase {
  constructor({
    userRepository,
    firebaseAdapter,
    emailService,
    emailQueue,
    notificationQueue,
    calendarAdapter
  }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
    this.calendarAdapter = calendarAdapter;
  }

  /**
   * Execute Apple OAuth
   * @param {AppleOAuthDTO} dto - Apple OAuth data
   * @returns {Promise<Object>} { user, accessToken, refreshToken, firebaseToken, isNewUser }
   */
  async execute(dto) {
    // Validate DTO
    const validation = dto.validate();
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // Verify Apple ID token
    const applePayload = await AppleOAuthService.verifyAppleIdToken(dto.identityToken);

    // Extract user info
    const appleUserInfo = AppleOAuthService.extractAppleUserInfo(applePayload, dto.userData);

    // Check if user exists by Apple ID
    let user = await this.userRepository.findByAppleId(appleUserInfo.appleId);
    let isNewUser = false;

    if (user) {
      // Existing user with Apple ID - update email if changed
      if (appleUserInfo.email && user.email !== appleUserInfo.email) {
        await this.userRepository.update(user.id, {
          email: appleUserInfo.email,
          emailVerified: appleUserInfo.emailVerified
        });
        // Refresh user data
        user = await this.userRepository.findById(user.id);
      }
    } else {
      // Check if user exists with the same email
      if (appleUserInfo.email) {
        user = await this.userRepository.findByEmail(appleUserInfo.email);
      }

      if (user) {
        // Link Apple account to existing user
        await this.userRepository.update(user.id, {
          appleId: appleUserInfo.appleId,
          emailVerified: appleUserInfo.emailVerified || user.emailVerified
        });
        // Refresh user data
        user = await this.userRepository.findById(user.id);
      } else {
        // New user - create account
        const username = await this._generateUniqueUsername(
          appleUserInfo.email || `apple_${appleUserInfo.appleId.substring(0, 8)}`
        );

        user = await this.userRepository.create({
          email: appleUserInfo.email || null, // Apple may hide email
          username,
          fullName: appleUserInfo.fullName,
          emailVerified: appleUserInfo.emailVerified,
          profilePicture: {
            emoji: '👤',
            backgroundColor: '#808080'
          },
          role: 'user',
          isActive: true,
          isBlocked: false,
          appleId: appleUserInfo.appleId
        });

        isNewUser = true;
      }
    }

    // Send welcome email for new users (async, non-blocking)
    if (isNewUser) {
      this._sendWelcomeEmail(user).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    }

    // Create default Jaaiye calendar for all users if they don't have one (async, non-blocking)
    if (this.calendarAdapter) {
      this.calendarAdapter.createOnRegistration(user).catch(err => {
        console.error('Failed to create default calendar:', err);
      });
    }

    // Create user entity
    const userEntity = new UserEntity(user);

    // Check if user can login
    userEntity.canLogin();

    // Generate tokens
    const accessToken = TokenService.generateAccessToken(userEntity);
    const refreshToken = TokenService.generateRefreshToken(userEntity.id);
    const firebaseToken = this.firebaseAdapter
      ? await this.firebaseAdapter.generateToken(userEntity.id)
      : null;

    // Save refresh token to user
    const { addDaysToNow, now } = require('../../../utils/dateUtils');
    const refreshExpiry = addDaysToNow(90); // 90 days from now (UTC)
    await this.userRepository.update(userEntity.id, {
      'refresh.token': refreshToken,
      'refresh.firebaseToken': firebaseToken,
      'refresh.expiresAt': refreshExpiry,
      lastLogin: now()
    });

    return {
      user: userEntity,
      accessToken,
      refreshToken,
      firebaseToken,
      isNewUser
    };
  }

  /**
   * Send welcome email (private helper)
   * @private
   */
  async _sendWelcomeEmail(user) {
    if (this.emailQueue) {
      await this.emailQueue.sendWelcomeEmailAsync(
        user.email,
        user.username || user.fullName || 'User'
      );
    } else if (this.emailService) {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        name: user.username || user.fullName
      });
    }
  }

  /**
   * Generate unique username from email or Apple ID
   * @private
   */
  async _generateUniqueUsername(emailOrId) {
    let username = AppleOAuthService.generateUsernameFromEmail(emailOrId);
    let suffix = 0;

    while (await this.userRepository.usernameExists(username)) {
      suffix++;
      const baseUsername = AppleOAuthService.generateUsernameFromEmail(emailOrId);
      username = `${baseUsername}${suffix}`;
    }

    return username;
  }
}

module.exports = AppleOAuthUseCase;

