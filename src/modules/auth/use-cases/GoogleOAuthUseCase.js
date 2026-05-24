/**
 * Google OAuth Use Case
 * Handles Google OAuth login/register.
 * Refresh tokens stored in Redis. lastLogin is fire-and-forget.
 */

const { ValidationError } = require('../errors');
const { OAuthService } = require('../services');
const { TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');

class GoogleOAuthUseCase {
  constructor({
    userRepository,
    firebaseAdapter,
    emailService,
    emailQueue,
    notificationQueue,
    calendarAdapter,
    googleCalendarAdapter,
    calendarSyncAdapter,
    redisAuthService
  }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
    this.calendarAdapter = calendarAdapter;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.calendarSyncAdapter = calendarSyncAdapter;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute Google OAuth
   * @param {GoogleOAuthDTO} dto - Google OAuth data
   * @returns {Promise<Object>} { user, accessToken, refreshToken, firebaseToken, isNewUser }
   */
  async execute(dto) {
    const validation = dto.validate();
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    const googlePayload = await OAuthService.verifyGoogleIdToken(dto.idToken);
    const googleUserInfo = OAuthService.extractGoogleUserInfo(googlePayload);

    let user = await this.userRepository.findByEmail(googleUserInfo.email);
    let isNewUser = false;

    if (user) {
      if (!user.googleCalendar || !user.googleCalendar.googleId) {
        await this.userRepository.update(user.id, {
          'googleCalendar.googleId': googleUserInfo.googleId
        });
      }
    } else {
      const username = await this._generateUniqueUsername(googleUserInfo.email);

      user = await this.userRepository.create({
        email: googleUserInfo.email,
        username,
        fullName: googleUserInfo.fullName,
        emailVerified: googleUserInfo.emailVerified,
        profilePicture: googleUserInfo.profilePicture,
        role: 'user',
        isActive: true,
        isBlocked: false,
        googleCalendar: {
          googleId: googleUserInfo.googleId
        }
      });

      isNewUser = true;
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

    if (dto.serverAuthCode) {
      console.log('Note: serverAuthCode provided but Calendar linking requires separate OAuth flow');
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
    if (this.notificationQueue) {
      await this.notificationQueue.add('send-welcome-email', {
        userId: user.id,
        email: user.email,
        username: user.username
      });
    } else if (this.emailService) {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        name: user.username
      });
    }
  }

  /** @private */
  async _generateUniqueUsername(email) {
    let username = OAuthService.generateUsernameFromEmail(email);
    let suffix = 0;

    while (await this.userRepository.usernameExists(username)) {
      suffix++;
      username = `${OAuthService.generateUsernameFromEmail(email)}${suffix}`;
    }

    return username;
  }
}

module.exports = GoogleOAuthUseCase;
