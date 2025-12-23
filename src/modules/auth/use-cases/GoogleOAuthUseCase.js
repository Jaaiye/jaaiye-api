/**
 * Google OAuth Use Case
 * Handles Google OAuth login/register
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
    notificationQueue,
    calendarAdapter,
    googleCalendarAdapter,
    calendarSyncAdapter
  }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailService = emailService;
    this.notificationQueue = notificationQueue;
    this.calendarAdapter = calendarAdapter;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.calendarSyncAdapter = calendarSyncAdapter;
  }

  /**
   * Execute Google OAuth
   * @param {GoogleOAuthDTO} dto - Google OAuth data
   * @returns {Promise<Object>} { user, accessToken, refreshToken, firebaseToken, isNewUser }
   */
  async execute(dto) {
    // Validate DTO
    const validation = dto.validate();
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // Verify Google ID token
    const googlePayload = await OAuthService.verifyGoogleIdToken(dto.idToken);

    // Extract user info
    const googleUserInfo = OAuthService.extractGoogleUserInfo(googlePayload);

    // Check if user exists by email
    let user = await this.userRepository.findByEmail(googleUserInfo.email); //
    let isNewUser = false;

    if (user) {
      // Existing user - link Google account if not already linked
      if (!user.googleCalendar || !user.googleCalendar.googleId) {
        await this.userRepository.update(user.id, {
          'googleCalendar.googleId': googleUserInfo.googleId
        });
      }
    } else {
      // New user - create account
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

    // Send welcome email for new users (async, non-blocking)
    if (isNewUser) {
      this._sendWelcomeEmail(user).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    }

    // Create default Jaaiye calendar for all users if they don't have one (async, non-blocking)
    // This ensures every user who signs in with Google has a calendar
    if (this.calendarAdapter) {
      this.calendarAdapter.createOnGoogleOAuth(user).catch(err => {
        console.error('Failed to create default calendar:', err);
      });
    }

    // Note: Firebase auth codes cannot be exchanged for Google Calendar tokens
    // Users must use the separate Google Calendar OAuth flow:
    // GET /api/v1/calendars/google/oauth/initiate
    // This ensures proper refresh token handling and avoids invalid_grant errors
    if (dto.serverAuthCode) {
      console.log('Note: serverAuthCode provided but Calendar linking requires separate OAuth flow');
      // Don't attempt to exchange Firebase codes for Calendar tokens
    }

    // Create user entity (use refreshed user if calendar was linked)
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
    const refreshExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
    await this.userRepository.update(userEntity.id, {
      'refresh.token': refreshToken,
      'refresh.firebaseToken': firebaseToken,
      'refresh.expiresAt': refreshExpiry,
      lastLogin: new Date()
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

  /**
   * Generate unique username from email
   * @private
   */
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

