/**
 * Apple OAuth Use Case
 * Handles Apple Sign In login/register.
 * Refresh tokens stored in Redis. lastLogin is fire-and-forget.
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
    calendarAdapter,
    redisAuthService
  }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
    this.calendarAdapter = calendarAdapter;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute Apple OAuth
   * @param {AppleOAuthDTO} dto - Apple OAuth data
   * @returns {Promise<Object>} { user, accessToken, refreshToken, firebaseToken, isNewUser }
   */
  async execute(dto) {
    const validation = dto.validate();
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    const applePayload = await AppleOAuthService.verifyAppleIdToken(dto.identityToken);
    const appleUserInfo = AppleOAuthService.extractAppleUserInfo(applePayload, dto.userData);

    let user = await this.userRepository.findByAppleId(appleUserInfo.appleId);
    let isNewUser = false;

    if (user) {
      if (appleUserInfo.email && user.email !== appleUserInfo.email) {
        await this.userRepository.update(user.id, {
          email: appleUserInfo.email,
          emailVerified: appleUserInfo.emailVerified
        });
        user = await this.userRepository.findById(user.id);
      }
    } else {
      if (appleUserInfo.email) {
        user = await this.userRepository.findByEmail(appleUserInfo.email);
      }

      if (user) {
        await this.userRepository.update(user.id, {
          appleId: appleUserInfo.appleId,
          emailVerified: appleUserInfo.emailVerified || user.emailVerified
        });
        user = await this.userRepository.findById(user.id);
      } else {
        const username = await this._generateUniqueUsername(
          appleUserInfo.email || `apple_${appleUserInfo.appleId.substring(0, 8)}`
        );

        user = await this.userRepository.create({
          email: appleUserInfo.email || null,
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

    if (isNewUser) {
      this._sendWelcomeEmail(user).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    }

    if (this.calendarAdapter) {
      this.calendarAdapter.createOnRegistration(user).catch(err => {
        console.error('Failed to create default calendar:', err);
      });
    }

    const userEntity = new UserEntity(user);
    userEntity.canLogin();

    const accessToken = TokenService.generateAccessToken(userEntity);
    const refreshToken = TokenService.generateRefreshToken(userEntity.id);
    const firebaseToken = this.firebaseAdapter
      ? await this.firebaseAdapter.generateToken(userEntity.id)
      : null;

    const decoded = TokenService.verifyRefreshToken(refreshToken);

    // Store refresh session in Redis
    await this.redisAuthService.storeRefreshToken(userEntity.id, decoded.jti);

    // Record lastLogin fire-and-forget
    await this.redisAuthService.recordLastLogin(userEntity.id, (timestamp) =>
      this.userRepository.updateLastLogin(userEntity.id, timestamp)
    );

    return {
      user: userEntity,
      accessToken,
      refreshToken,
      firebaseToken,
      isNewUser
    };
  }

  /** @private */
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

  /** @private */
  async _generateUniqueUsername(emailOrId) {
    let username = AppleOAuthService.generateUsernameFromEmail(emailOrId);
    let suffix = 0;

    while (await this.userRepository.usernameExists(username)) {
      suffix++;
      username = `${AppleOAuthService.generateUsernameFromEmail(emailOrId)}${suffix}`;
    }

    return username;
  }
}

module.exports = AppleOAuthUseCase;
