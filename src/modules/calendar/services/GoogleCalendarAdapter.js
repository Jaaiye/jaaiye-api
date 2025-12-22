/**
 * Google Calendar Adapter
 * Infrastructure layer - Google Calendar API integration
 * Handles all Google Calendar operations
 */

const { google } = require('googleapis');
const { GoogleAccountNotLinkedError, GoogleTokenExpiredError } = require('../errors');
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
    const finalRedirectUri = redirectUri !== null
      ? redirectUri
      : (process.env.GOOGLE_REDIRECT_URI || '');

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
   * @returns {Promise<Object>} Tokens { access_token, refresh_token, scope, expiry_date }
   */
  async exchangeServerAuthCode(serverAuthCode) {
    try {
      // For server-side auth codes, try without redirect URI first (or with 'postmessage')
      // Server auth codes don't require a redirect URI match
      let client = this._createOAuth2Client('postmessage');
      let tokens;

      try {
        const { tokens: tokenResult } = await client.getToken(serverAuthCode);
        tokens = tokenResult;
      } catch (firstError) {
        // If postmessage fails, try with empty string (some mobile SDKs use this)
        if (firstError.message?.includes('invalid_grant') || firstError.code === 'invalid_grant') {
          logger.warn('Failed with postmessage redirect, trying empty redirect URI');
          client = this._createOAuth2Client('');
          const { tokens: tokenResult } = await client.getToken(serverAuthCode);
          tokens = tokenResult;
        } else {
          throw firstError;
        }
      }

      logger.info('Exchanged Google server auth code successfully');
      return tokens; // { access_token, refresh_token, scope, expiry_date, id_token }
    } catch (error) {
      logger.error('Failed to exchange Google server auth code:', {
        error: error.message,
        code: error.code,
        status: error.status
      });

      // Provide helpful error message for common issues
      let errorMessage = error.message || 'Failed to exchange auth code';
      if (error.code === 'invalid_grant') {
        errorMessage = 'Auth code is invalid, expired, or already used. Please request a new code from the client.';
      }

      // Re-throw with enhanced error information
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.code = error.code;
      enhancedError.status = error.status;
      throw enhancedError;
    }
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
      logger.error('Failed to refresh Google access token:', {
        error: error.message,
        code: error.code,
        status: error.status,
        userId: user.id || user._id
      });

      // Re-throw with enhanced error information
      const enhancedError = new GoogleTokenExpiredError(error.message || 'Failed to refresh access token');
      enhancedError.originalError = error;
      enhancedError.code = error.code;
      enhancedError.status = error.status;
      throw enhancedError;
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

      if (user.googleCalendar && user.googleCalendar.jaaiyeCalendarId) {
        return user.googleCalendar.jaaiyeCalendarId;
      }

      // Try to find existing by summary
      const list = await calendar.calendarList.list();
      const existing = (list.data.items || []).find(i => i.summary === 'Jaaiye – Hangouts');
      if (existing) {
        await this.userRepository.update(user.id, {
          'googleCalendar.jaaiyeCalendarId': existing.id
        });
        return existing.id;
      }

      // Create new calendar
      const created = await calendar.calendars.insert({ requestBody: { summary: 'Jaaiye – Hangouts' } });
      const calId = created.data.id;
      // Insert into calendar list (ensures it appears)
      await calendar.calendarList.insert({ requestBody: { id: calId } });
      await this.userRepository.update(user.id, {
        'googleCalendar.jaaiyeCalendarId': calId
      });
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
      const calendarId = explicitCalendarId || user.googleCalendar.jaaiyeCalendarId || await this.ensureJaaiyeCalendar(user);
      const res = await calendar.events.insert({ calendarId, requestBody: eventBody });
      return res.data; // contains id, etag, etc.
    } catch (error) {
      if (error.name === 'GoogleAccountNotLinkedError') throw error;
      logger.error('Failed to insert Google event', { error: error.message, userId: user.id || user._id });
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
