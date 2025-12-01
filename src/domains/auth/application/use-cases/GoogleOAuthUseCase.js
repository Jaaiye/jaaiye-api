/**
 * Google OAuth Use Case
 * Handles Google OAuth login/register
 */

const { ValidationError } = require('../../domain/errors');
const { OAuthService } = require('../../domain/services');
const { TokenService } = require('../../../shared/domain/services');
const { UserEntity } = require('../../../shared/domain/entities');

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
    let user = await this.userRepository.findByEmail(googleUserInfo.email);
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

      // Create default calendar for new users (async, non-blocking)
      if (this.calendarAdapter) {
        this.calendarAdapter.createOnGoogleOAuth(user).catch(err => {
          console.error('Failed to create default calendar:', err);
        });
      }
    }

    // Auto-link Google Calendar if serverAuthCode is provided
    if (dto.serverAuthCode && this.googleCalendarAdapter) {
      try {
        // Exchange the auth code for tokens
        const tokens = await this.googleCalendarAdapter.exchangeServerAuthCode(dto.serverAuthCode);

        // Save tokens to user
        await this.googleCalendarAdapter.saveTokensToUser(user, tokens);

        // Refresh user to get updated tokens
        user = await this.userRepository.findById(user.id);

        // Ensure the Jaaiye calendar exists using fresh tokens
        await this.googleCalendarAdapter.ensureJaaiyeCalendar(user, tokens);

        // Sync existing events (non-blocking)
        if (this.calendarSyncAdapter) {
          this.calendarSyncAdapter.syncExistingEventsToCalendar(user.id).catch(err => {
            console.error('Failed to sync existing events to calendar', {
              userId: user.id,
              error: err.message
            });
          });
        }

        console.log('Google Calendar automatically linked during OAuth sign-in');
      } catch (error) {
        // Log but don't fail authentication if calendar linking fails
        console.warn('Failed to auto-link Google Calendar during OAuth:', error.message);
        // Refresh user even if linking failed, in case tokens were partially saved
        user = await this.userRepository.findById(user.id);
      }
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

