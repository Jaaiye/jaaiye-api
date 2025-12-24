/**
 * Google Calendar Adapter
 * Infrastructure layer - Google Calendar API integration
 * Handles all Google Calendar operations
 */

const { google } = require('googleapis');
const crypto = require('crypto');
const { GoogleAccountNotLinkedError, GoogleTokenExpiredError, GoogleRefreshTokenInvalidError } = require('../errors');
const logger = require('../../../utils/logger');

class GoogleCalendarAdapter {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Create OAuth2 client
   * @private
   * @param {string} redirectUri - Optional redirect URI (for server auth codes, can be empty or postmessage)
   */
  _createOAuth2Client(redirectUri = null) {
    // For server-side auth codes, redirect URI can be empty, 'postmessage', or 'urn:ietf:wg:oauth:2.0:oob'
    // Use provided redirectUri, or fall back to env var, or use empty string for server auth codes
    let finalRedirectUri;

    if (redirectUri === null) {
      // Use environment variable as fallback
      finalRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'postmessage';
    } else {
      // Use provided redirect URI (including empty string)
      finalRedirectUri = redirectUri;
    }

    logger.debug('Creating OAuth2 client:', {
      redirectUri: finalRedirectUri,
      clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...'
    });

    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      finalRedirectUri
    );
  }

  /**
   * Set user credentials on OAuth2 client
   * @private
   */
  async _setUserCredentials(client, user) {
    if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
      throw new GoogleAccountNotLinkedError();
    }

    try {
      // Check if access token is expired or will expire soon (within 5 minutes)
      const now = new Date();
      const tokenExpiry = user.googleCalendar.expiryDate;
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (tokenExpiry && now >= tokenExpiry) {
        logger.info('Access token expired, refreshing...', { userId: user.id || user._id });

        // Refresh the access token
        const newTokens = await this.refreshAccessToken(user);

        // Update user with new tokens
        if (newTokens.access_token) {
          await this.userRepository.update(user.id, {
            'googleCalendar.accessToken': newTokens.access_token,
            'googleCalendar.expiryDate': newTokens.expiry_date
          });
          // Update local user object
          user.googleCalendar.accessToken = newTokens.access_token;
          user.googleCalendar.expiryDate = newTokens.expiry_date;
        }
      }

      client.setCredentials({
        refresh_token: user.googleCalendar.refreshToken,
        access_token: user.googleCalendar.accessToken,
        expiry_date: user.googleCalendar.expiryDate ? new Date(user.googleCalendar.expiryDate).getTime() : undefined,
        scope: user.googleCalendar.scope
      });
    } catch (error) {
      // Check if this is an invalid_grant error from refreshAccessToken
      if (error.name === 'GoogleRefreshTokenInvalidError') {
        // Re-throw as-is - already handled by refreshAccessToken
        throw error;
      }

      logger.error('Failed to set user credentials:', {
        error: error.message,
        userId: user.id || user._id
      });
      throw new Error(`Failed to authenticate with Google: ${error.message}`);
    }
  }

  /**
   * Validate that tokens have required scopes
   * @private
   */
  _validateCalendarScopes(tokens) {
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    if (!tokens.scope) {
      throw new Error('No scope information in tokens');
    }

    const userScopes = tokens.scope.split(' ');
    const missingScopes = requiredScopes.filter(scope => !userScopes.includes(scope));

    if (missingScopes.length > 0) {
      logger.warn('Missing required scopes:', missingScopes);
      logger.warn('User has scopes:', userScopes);
      throw new Error(`Insufficient scopes. Missing: ${missingScopes.join(', ')}`);
    }

    logger.info('✅ All required scopes are present:', userScopes);
    return true;
  }

  /**
   * Exchange server auth code for tokens
   * @param {string} serverAuthCode - Google server auth code
   * @param {Object} options - Optional metadata for debugging
   * @param {string} options.source - Source of the code (e.g., 'mobile', 'web')
   * @param {Date} options.receivedAt - When the code was received
   * @returns {Promise<Object>} Tokens { access_token, refresh_token, scope, expiry_date }
   */
  async exchangeServerAuthCode(serverAuthCode, options = {}) {
    const { source, receivedAt } = options;
    const codeReceivedTime = receivedAt || new Date();

    try {
      // Validate code format before attempting exchange
      if (!serverAuthCode || typeof serverAuthCode !== 'string') {
        throw new Error('Invalid auth code format: code must be a non-empty string');
      }

      // Check if code might be expired (server auth codes expire in ~10 minutes)
      const timeSinceReceived = Date.now() - codeReceivedTime.getTime();
      const tenMinutes = 10 * 60 * 1000;
      if (timeSinceReceived > tenMinutes) {
        logger.warn('Server auth code may be expired:', {
          ageMinutes: Math.round(timeSinceReceived / 60000),
          maxAgeMinutes: 10
        });
      }

      // Log exchange attempt for debugging
      logger.info('Exchanging Google server auth code:', {
        codeLength: serverAuthCode.length,
        codePrefix: serverAuthCode.substring(0, 10) + '...',
        source: source || 'unknown',
        ageSeconds: Math.round(timeSinceReceived / 1000),
        clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...'
      });
      console.log(process.env.GOOGLE_REDIRECT_URI)

      // Try multiple redirect URI strategies for server-side auth codes
      const redirectUriStrategies = [
        process.env.GOOGLE_REDIRECT_URI,
        'postmessage',  // Standard for server-side auth codes
        '',             // Empty string for some mobile SDKs
        'urn:ietf:wg:oauth:2.0:oob'  // Out-of-band flow
      ];

      let tokens = null;
      let lastError = null;
      let successfulRedirectUri = null;

      for (const redirectUri of redirectUriStrategies) {
        try {
          logger.debug(`Attempting exchange with redirect URI: '${redirectUri}'`);

          const client = this._createOAuth2Client(redirectUri);
          const result = await client.getToken(serverAuthCode);

          tokens = result.tokens;
          successfulRedirectUri = redirectUri;
          logger.info('Successfully exchanged auth code:', {
            redirectUri: successfulRedirectUri,
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token
          });
          break;
        } catch (error) {
          lastError = error;
          logger.debug(`Failed with redirect URI '${redirectUri}':`, {
            error: error.message,
            code: error.code
          });
          // Continue to next strategy
        }
      }

      // If all strategies failed, throw the last error with enhanced information
      if (!tokens) {
        throw lastError;
      }

      logger.info('Exchanged Google server auth code successfully:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        redirectUriUsed: successfulRedirectUri,
        scope: tokens.scope?.substring(0, 50) + '...'
      });

      return tokens;
    } catch (error) {
      // Determine specific cause of invalid_grant
      const isInvalidGrant = error.code === 'invalid_grant' ||
        error.message?.toLowerCase().includes('invalid_grant') ||
        error.response?.data?.error === 'invalid_grant';

      let errorMessage = error.message || 'Failed to exchange auth code';
      let errorDetails = {
        code: error.code,
        status: error.status,
        message: error.message
      };

      if (isInvalidGrant) {
        // Provide specific error messages based on common causes
        const timeSinceReceived = Date.now() - codeReceivedTime.getTime();
        const ageMinutes = Math.round(timeSinceReceived / 60000);

        if (ageMinutes > 10) {
          errorMessage = 'Auth code has expired. Server auth codes expire after 10 minutes. Please request a new code from the client.';
          errorDetails.cause = 'expired';
          errorDetails.ageMinutes = ageMinutes;
        } else if (error.response?.data?.error_description?.toLowerCase().includes('already been used')) {
          errorMessage = 'Auth code has already been used. Each code can only be exchanged once. Please request a new code from the client.';
          errorDetails.cause = 'already_used';
        } else if (error.response?.data?.error_description?.toLowerCase().includes('redirect_uri')) {
          errorMessage = 'Auth code redirect URI mismatch. The code may have been generated with a different redirect URI configuration.';
          errorDetails.cause = 'redirect_uri_mismatch';
        } else {
          errorMessage = 'Auth code is invalid, expired, or already used. Please request a new code from the client.';
          errorDetails.cause = 'unknown';
        }

        errorDetails.suggestedAction = 'Request a new auth code from the client and exchange it immediately';
      }

      logger.error('Failed to exchange Google server auth code:', {
        ...errorDetails,
        codeLength: serverAuthCode?.length,
        codePrefix: serverAuthCode?.substring(0, 10) + '...',
        source: source || 'unknown',
        ageSeconds: Math.round((Date.now() - codeReceivedTime.getTime()) / 1000)
      });

      // Re-throw with enhanced error information
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.code = error.code;
      enhancedError.status = error.status;
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  }

  /**
   * Generate OAuth2 authorization URL for Google Calendar
   * @param {string} userId - User ID (for state parameter)
   * @param {string} backendRedirectUri - Backend redirect URI (HTTPS, e.g., https://api.jaaiye.com/oauth/redirect)
   * @param {string} mobileRedirectUri - Mobile app redirect URI (URL scheme, e.g., jaaiye://oauthredirect)
   * @returns {Object} { url: string, state: string }
   */
  generateOAuthUrl(userId, backendRedirectUri, mobileRedirectUri) {
    if (!backendRedirectUri) {
      throw new Error('backendRedirectUri is required for OAuth flow');
    }

    if (!mobileRedirectUri) {
      throw new Error('mobileRedirectUri is required for OAuth flow');
    }

    // Generate state parameter for CSRF protection
    // Format: randomHex:userId:base64EncodedMobileRedirectUri
    // Backend will extract mobileRedirectUri from state to redirect to mobile app
    const randomToken = crypto.randomBytes(32).toString('hex');
    const encodedMobileRedirectUri = Buffer.from(mobileRedirectUri).toString('base64');
    const state = `${randomToken}:${userId}:${encodedMobileRedirectUri}`;

    // Use backendRedirectUri as the OAuth redirect URI (Google requirement)
    // Google will redirect to backend, backend will redirect to mobile app
    const client = this._createOAuth2Client(backendRedirectUri);

    // Required scopes for Google Calendar
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
    ];

    const authUrl = client.generateAuthUrl({
      access_type: 'offline', // Required for refresh token
      prompt: 'consent', // Force consent screen to ensure refresh token
      scope: scopes,
      state: state,
      include_granted_scopes: true
    });

    logger.info('Generated OAuth URL for Google Calendar:', {
      userId,
      backendRedirectUri,
      mobileRedirectUri,
      stateLength: state.length
    });

    return {
      url: authUrl,
      state: state
    };
  }

  /**
   * Exchange OAuth callback code for tokens (direct Google OAuth, not Firebase)
   * @param {string} code - OAuth authorization code from Google callback
   * @param {string} redirectUri - Redirect URI used in OAuth flow (must match)
   * @returns {Promise<Object>} Tokens { access_token, refresh_token, scope, expiry_date }
   */
  async exchangeOAuthCallbackCode(code, redirectUri) {
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid OAuth code: code must be a non-empty string');
    }

    if (!redirectUri) {
      throw new Error('redirectUri is required and must match the one used in OAuth flow');
    }

    try {
      logger.debug('Exchanging OAuth code with redirectUri:', {
        redirectUri,
        codeLength: code.length,
        codePrefix: code.substring(0, 10) + '...'
      });

      const client = this._createOAuth2Client(redirectUri);
      const { tokens } = await client.getToken(code);

      logger.info('Successfully exchanged OAuth callback code for tokens:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        scope: tokens.scope?.substring(0, 50) + '...'
      });

      // Validate that we got a refresh token (critical for offline access)
      if (!tokens.refresh_token) {
        logger.warn('No refresh token received - user may need to re-authenticate with prompt=consent');
        throw new Error('No refresh token received. Please ensure access_type=offline and prompt=consent are set in OAuth flow.');
      }

      return tokens;
    } catch (error) {
      logger.error('Failed to exchange OAuth callback code:', {
        error: error.message,
        code: error.code,
        redirectUri,
        errorResponse: error.response?.data,
        errorDetails: error.response?.data?.error_description
      });

      if (error.code === 'invalid_grant' || error.response?.data?.error === 'invalid_grant') {
        const errorDesc = error.response?.data?.error_description || '';
        let errorMessage = 'OAuth code is invalid, expired, or already used.';

        if (errorDesc.includes('redirect_uri_mismatch') || errorDesc.includes('redirect_uri')) {
          errorMessage = `Redirect URI mismatch. The redirect URI used to exchange the code ("${redirectUri}") must exactly match the one used to generate the OAuth URL. Please ensure it's added to Google Cloud Console and matches exactly.`;
        } else if (errorDesc.includes('expired') || errorDesc.includes('invalid')) {
          errorMessage = 'OAuth code has expired or is invalid. Please restart the OAuth flow and exchange the code immediately.';
        } else if (errorDesc.includes('already been used')) {
          errorMessage = 'OAuth code has already been used. Each code can only be exchanged once. Please restart the OAuth flow.';
        }

        throw new Error(errorMessage);
      }

      throw error;
    }
  }

  /**
   * Extract data from OAuth state parameter
   * @param {string} state - State parameter from OAuth callback
   * @returns {Object} { userId: string, mobileRedirectUri: string }
   */
  extractOAuthState(state) {
    if (!state) {
      throw new Error('State parameter is required for OAuth security');
    }

    // Extract userId and mobileRedirectUri from state
    // Format: "randomHex:userId:base64EncodedMobileRedirectUri"
    const parts = state.split(':');
    if (parts.length < 2) {
      throw new Error('Invalid state format - missing user ID');
    }

    const userId = parts[1];

    if (!userId) {
      throw new Error('User ID is required in state parameter');
    }

    let mobileRedirectUri = null;
    if (parts.length >= 3) {
      // Decode mobile redirect URI from base64
      mobileRedirectUri = Buffer.from(parts[2], 'base64').toString('utf-8');
    }

    return { userId, mobileRedirectUri };
  }

  /**
   * Refresh Google access token
   * @param {Object} user - User entity/document with googleCalendar
   * @returns {Promise<Object>} New tokens { access_token, expiry_date, scope }
   */
  async refreshAccessToken(user) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      client.setCredentials({
        refresh_token: user.googleCalendar.refreshToken
      });

      const { credentials } = await client.refreshAccessToken();
      logger.info('Refreshed Google access token successfully');

      return {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        scope: credentials.scope
      };
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;

      // Check for invalid_grant error (refresh token invalid/revoked)
      const isInvalidGrant = error.code === 'invalid_grant' ||
        error.message?.toLowerCase().includes('invalid_grant') ||
        error.response?.data?.error === 'invalid_grant';

      if (isInvalidGrant) {
        logger.warn('Google refresh token is invalid or revoked:', {
          userId: user.id || user._id,
          code: error.code
        });

        // Mark account as invalid and notify user
        await this._markGoogleAccountAsInvalid(user.id || user._id);

        const invalidError = new GoogleRefreshTokenInvalidError();
        invalidError.originalError = error;
        invalidError.code = error.code;
        invalidError.status = error.status;
        throw invalidError;
      }

      logger.error('Failed to refresh Google access token:', {
        error: error.message,
        code: error.code,
        status: error.status,
        userId: user.id || user._id
      });

      // Re-throw with enhanced error information for other errors
      const enhancedError = new GoogleTokenExpiredError(error.message || 'Failed to refresh access token');
      enhancedError.originalError = error;
      enhancedError.code = error.code;
      enhancedError.status = error.status;
      throw enhancedError;
    }
  }

  /**
   * Mark Google account as invalid (refresh token revoked/invalid)
   * Clears refresh token and notifies user
   * @private
   */
  async _markGoogleAccountAsInvalid(userId) {
    try {
      // Clear refresh token but keep other Google calendar data
      await this.userRepository.update(userId, {
        'googleCalendar.refreshToken': null,
        'googleCalendar.accessToken': null,
        'googleCalendar.expiryDate': null,
        'googleCalendar.tokenInvalid': true,
        'googleCalendar.tokenInvalidAt': new Date()
      });

      // Send notification to user
      try {
        const { SendNotificationUseCase } = require('../../notification/use-cases');
        const { NotificationRepository } = require('../../notification/repositories');
        const notificationRepository = new NotificationRepository();
        const sendNotificationUseCase = new SendNotificationUseCase({
          notificationRepository,
          pushNotificationAdapter: null // Don't send push, just in-app
        });

        await sendNotificationUseCase.execute(userId, {
          title: 'Google Account Re-link Required',
          body: 'Your Google Calendar connection has expired. Please re-link your Google account to continue syncing events.'
        }, {
          type: 'warning',
          action: 're_link_google_account'
        });
      } catch (notifError) {
        logger.warn('Failed to send notification for invalid Google account:', {
          userId,
          error: notifError.message
        });
      }

      logger.info('Marked Google account as invalid:', { userId });
    } catch (error) {
      logger.error('Failed to mark Google account as invalid:', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * Save tokens to user
   * @param {Object} user - User entity/document
   * @param {Object} tokens - Google tokens
   * @returns {Promise<void>}
   */
  async saveTokensToUser(user, tokens) {
    try {
      const updates = {
        'providerLinks.google': true
      };

      if (tokens.refresh_token) {
        updates['googleCalendar.refreshToken'] = tokens.refresh_token;
      }
      if (tokens.access_token) {
        updates['googleCalendar.accessToken'] = tokens.access_token;
      }
      if (tokens.expiry_date) {
        updates['googleCalendar.expiryDate'] = new Date(tokens.expiry_date);
      }
      if (tokens.scope) {
        updates['googleCalendar.scope'] = tokens.scope;
      }

      await this.userRepository.update(user.id, updates);
    } catch (error) {
      logger.error('Failed to save tokens to user', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Ensure Jaaiye calendar exists in Google Calendar
   * @param {Object} user - User entity/document
   * @param {Object} tokens - Optional tokens (for initial linking)
   * @returns {Promise<string>} Google calendar ID
   */
  async ensureJaaiyeCalendar(user, tokens = null) {
    try {
      const client = this._createOAuth2Client();

      if (tokens) {
        // Validate scopes before proceeding
        this._validateCalendarScopes(tokens);

        // Use provided tokens directly (for initial linking)
        logger.info('Setting credentials with tokens:', {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          scope: tokens.scope,
          expiryDate: tokens.expiry_date
        });

        client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).getTime() : undefined
        });
      } else {
        // Use saved user credentials (for existing users)
        await this._setUserCredentials(client, user);
      }

      const calendar = google.calendar({ version: 'v3', auth: client });

      // If we have a stored calendar ID, verify it exists before returning it
      if (user.googleCalendar && user.googleCalendar.jaaiyeCalendarId) {
        try {
          // Verify the calendar exists and is accessible
          await calendar.calendars.get({ calendarId: user.googleCalendar.jaaiyeCalendarId });
          logger.debug('Verified stored Jaaiye calendar exists:', {
            calendarId: user.googleCalendar.jaaiyeCalendarId,
            userId: user.id || user._id
          });
          return user.googleCalendar.jaaiyeCalendarId;
        } catch (verifyError) {
          // Calendar doesn't exist or is inaccessible - clear it and continue to find/create
          logger.warn('Stored Jaaiye calendar ID is invalid, will find or create new one:', {
            calendarId: user.googleCalendar.jaaiyeCalendarId,
            error: verifyError.message,
            userId: user.id || user._id
          });
          // Clear the invalid calendar ID from database
          await this.userRepository.update(user.id, {
            'googleCalendar.jaaiyeCalendarId': null
          });
          // Clear from in-memory user object
          user.googleCalendar.jaaiyeCalendarId = null;
        }
      }

      // Try to find existing by summary
      const list = await calendar.calendarList.list();
      const existing = (list.data.items || []).find(i => i.summary === 'Jaaiye – Hangouts');
      if (existing) {
        await this.userRepository.update(user.id, {
          'googleCalendar.jaaiyeCalendarId': existing.id
        });
        // Update in-memory user object
        if (!user.googleCalendar) {
          user.googleCalendar = {};
        }
        user.googleCalendar.jaaiyeCalendarId = existing.id;
        logger.info('Found existing Jaaiye calendar:', { calendarId: existing.id, userId: user.id || user._id });
        return existing.id;
      }

      // Create new calendar
      logger.info('Creating new Jaaiye calendar:', { userId: user.id || user._id });
      const created = await calendar.calendars.insert({ requestBody: { summary: 'Jaaiye – Hangouts' } });
      const calId = created.data.id;
      // Insert into calendar list (ensures it appears)
      await calendar.calendarList.insert({ requestBody: { id: calId } });
      await this.userRepository.update(user.id, {
        'googleCalendar.jaaiyeCalendarId': calId
      });
      // Update in-memory user object
      if (!user.googleCalendar) {
        user.googleCalendar = {};
      }
      user.googleCalendar.jaaiyeCalendarId = calId;
      logger.info('Created new Jaaiye calendar:', { calendarId: calId, userId: user.id || user._id });
      return calId;
    } catch (error) {
      logger.error('Failed to ensure Jaaiye calendar', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * List Google calendars
   * @param {Object} user - User entity/document
   * @returns {Promise<Array>} List of Google calendars
   */
  async listCalendars(user) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const res = await calendar.calendarList.list();
      const items = res.data.items || [];
      return items.map(c => ({ id: c.id, summary: c.summary, primary: !!c.primary }));
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to list Google calendars', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * List Google Calendar events
   * @param {Object} user - User entity/document
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @param {Array<string>|null} calendarIds - Optional calendar IDs
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} List of events
   */
  async listEvents(user, timeMin, timeMax, calendarIds = null, options = {}) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const ids = (calendarIds && calendarIds.length ? calendarIds : (user.googleCalendar?.selectedCalendarIds || ['primary']));
      const results = [];

      for (const id of ids) {
        const res = await calendar.events.list({
          calendarId: id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          ...options
        });
        const items = res.data.items || [];
        for (const ev of items) {
          results.push({
            calendarId: id,
            id: ev.id,
            summary: ev.summary,
            description: ev.description,
            location: ev.location,
            start: ev.start,
            end: ev.end,
            organizer: ev.organizer,
            attendees: ev.attendees,
            etag: ev.etag,
            htmlLink: ev.htmlLink,
            recurringEventId: ev.recurringEventId,
            originalStartTime: ev.originalStartTime,
            created: ev.created,
            updated: ev.updated
          });
        }
      }
      return results;
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to list Google events', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Get free/busy information
   * @param {Object} user - User entity/document
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @param {Array<string>|null} calendarIds - Optional calendar IDs
   * @returns {Promise<Object>} Free/busy data
   */
  async getFreeBusy(user, timeMin, timeMax, calendarIds = null) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const items = (calendarIds && calendarIds.length ? calendarIds : (user.googleCalendar?.selectedCalendarIds || ['primary']))
        .map(id => ({ id }));
      const res = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          items
        }
      });
      return res.data.calendars || {};
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to get free/busy', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Insert event into Google Calendar
   * @param {Object} user - User entity/document
   * @param {Object} eventBody - Google Calendar event body
   * @param {string} explicitCalendarId - Optional explicit calendar ID
   * @returns {Promise<Object>} Created event
   */
  async insertEvent(user, eventBody, explicitCalendarId = null) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });

      // Determine calendar ID - try explicit, then ensure/create (which will verify stored ID)
      let calendarId = explicitCalendarId;

      // If no explicit calendar ID, ensure/create one (this will verify stored ID exists)
      if (!calendarId) {
        calendarId = await this.ensureJaaiyeCalendar(user);
      }

      logger.debug('Inserting event into Google Calendar:', {
        calendarId,
        eventTitle: eventBody.summary,
        userId: user.id || user._id
      });

      const res = await calendar.events.insert({ calendarId, requestBody: eventBody });
      return res.data; // contains id, etag, etc.
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;

      // Enhanced error logging
      const errorDetails = {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        userId: user.id || user._id,
        calendarId: explicitCalendarId || user.googleCalendar?.jaaiyeCalendarId || 'none',
        eventTitle: eventBody?.summary
      };

      // Check if it's a "Not Found" error for calendar
      if (error.code === 404 || error.response?.status === 404) {
        logger.error('Google Calendar not found - calendar may have been deleted:', errorDetails);
        // Clear the invalid calendar ID so it will be recreated next time
        if (user.googleCalendar?.jaaiyeCalendarId) {
          await this.userRepository.update(user.id, {
            'googleCalendar.jaaiyeCalendarId': null
          }).catch(err => {
            logger.warn('Failed to clear invalid calendar ID:', { userId: user.id, error: err.message });
          });
        }
        throw new Error('Google Calendar not found. The calendar may have been deleted. Please re-link your Google account.');
      }

      logger.error('Failed to insert Google event', errorDetails);
      throw error;
    }
  }

  /**
   * Update event in Google Calendar
   * @param {Object} user - User entity/document
   * @param {string} calendarId - Google calendar ID
   * @param {string} eventId - Google event ID
   * @param {Object} eventBody - Updated event body
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(user, calendarId, eventId, eventBody) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const res = await calendar.events.patch({ calendarId, eventId, requestBody: eventBody });
      return res.data;
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to update Google event', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Delete event from Google Calendar
   * @param {Object} user - User entity/document
   * @param {string} calendarId - Google calendar ID
   * @param {string} eventId - Google event ID
   * @returns {Promise<boolean>}
   */
  async deleteEvent(user, calendarId, eventId) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      await calendar.events.delete({ calendarId, eventId });
      return true;
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to delete Google event', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Backfill sync for selected calendars
   * @param {Object} user - User entity/document
   * @param {string} timeMin - ISO string
   * @param {string} timeMax - ISO string
   * @returns {Promise<Array>} Per-calendar event data
   */
  async backfillSelectedCalendars(user, timeMin, timeMax) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const ids = user.googleCalendar?.selectedCalendarIds || ['primary'];
      const perCal = [];

      for (const id of ids) {
        const res = await calendar.events.list({
          calendarId: id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime'
        });
        perCal.push({ id, items: res.data.items || [] });
      }
      return perCal;
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to backfill Google calendars', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Incremental sync for calendar
   * @param {Object} user - User entity/document
   * @returns {Promise<Array>} Updates per calendar
   */
  async incrementalSync(user) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const updates = [];
      const selected = user.googleCalendar?.selectedCalendarIds || ['primary'];
      const calendars = user.googleCalendar.calendars || [];

      for (const id of selected) {
        let calState = calendars.find(c => c.id === id);
        if (!calState) {
          calState = { id };
          calendars.push(calState);
        }
        const params = { calendarId: id, singleEvents: true, orderBy: 'startTime' };
        if (calState.syncToken) params.syncToken = calState.syncToken;

        const res = await calendar.events.list(params).catch(async (err) => {
          if (err?.code === 410) {
            calState.syncToken = undefined; // reset
            return await calendar.events.list({ calendarId: id, singleEvents: true, orderBy: 'startTime' });
          }
          throw err;
        });

        calState.syncToken = res.data.nextSyncToken || calState.syncToken;
        if (Array.isArray(res.data.items)) {
          updates.push({ calendarId: id, items: res.data.items });
        }
      }

      // Update user with new sync tokens
      await this.userRepository.update(user.id, {
        'googleCalendar.calendars': calendars
      });

      return updates;
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to incremental sync', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Start watch for calendar changes
   * @param {Object} user - User entity/document
   * @param {string} calendarId - Google calendar ID
   * @param {string} channelId - Channel ID (UUID)
   * @param {string} webhookUrl - Webhook URL
   * @returns {Promise<Object>} Watch resource
   */
  async startWatch(user, calendarId, channelId, webhookUrl) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const resource = await calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId, // UUID you generate
          type: 'web_hook',
          address: webhookUrl,
          token: process.env.GOOGLE_CHANNEL_TOKEN || undefined
        }
      });

      const calendars = user.googleCalendar.calendars || [];
      const calState = calendars.find(c => c.id === calendarId);
      if (calState) {
        calState.channelId = resource.data.id;
        calState.resourceId = resource.data.resourceId;
        calState.expiration = resource.data.expiration ? new Date(Number(resource.data.expiration)) : undefined;
        await this.userRepository.update(user.id, {
          'googleCalendar.calendars': calendars
        });
      }
      return resource.data;
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to start Google watch', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }

  /**
   * Stop watch for calendar changes
   * @param {Object} user - User entity/document
   * @param {string} calendarId - Google calendar ID
   * @returns {Promise<boolean>}
   */
  async stopWatch(user, calendarId) {
    try {
      if (!user.googleCalendar || !user.googleCalendar.refreshToken) {
        throw new GoogleAccountNotLinkedError();
      }

      const client = this._createOAuth2Client();
      await this._setUserCredentials(client, user);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const calendars = user.googleCalendar.calendars || [];
      const calState = calendars.find(c => c.id === calendarId);

      if (calState?.channelId && calState?.resourceId) {
        await calendar.channels.stop({
          requestBody: {
            id: calState.channelId,
            resourceId: calState.resourceId
          }
        });
        calState.channelId = undefined;
        calState.resourceId = undefined;
        calState.expiration = undefined;
        await this.userRepository.update(user.id, {
          'googleCalendar.calendars': calendars
        });
        return true;
      }
      return false;
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to stop Google watch', { error: error.message, userId: user.id || user._id });
      throw error;
    }
  }
}

module.exports = GoogleCalendarAdapter;
