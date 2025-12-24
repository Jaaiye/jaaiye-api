/**
 * Calendar Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const { formatCalendarResponse } = require('../../utils/calendarHelpers');
const googleUtils = require('../../utils/googleUtils');

class CalendarController {
  constructor({
    createCalendarUseCase,
    getCalendarsUseCase,
    getCalendarUseCase,
    updateCalendarUseCase,
    deleteCalendarUseCase,
    getCalendarEventsUseCase,
    linkGoogleCalendarsUseCase,
    setPrimaryGoogleCalendarUseCase,
    linkGoogleAccountUseCase,
    unlinkGoogleAccountUseCase,
    initiateGoogleOAuthUseCase,
    handleGoogleOAuthCallbackUseCase,
    refreshGoogleTokenUseCase,
    listGoogleCalendarsUseCase,
    selectGoogleCalendarsUseCase,
    createCalendarMappingUseCase,
    getCalendarMappingUseCase,
    listGoogleEventsUseCase,
    getFreeBusyUseCase,
    getUnifiedCalendarUseCase,
    getMonthlyCalendarUseCase,
    syncCalendarUseCase,
    backfillSyncUseCase,
    startWatchUseCase,
    stopWatchUseCase,
    getDiagnosticsUseCase,
    getSharedCalendarViewUseCase,
    googleCalendarAdapter
  }) {
    this.createCalendarUseCase = createCalendarUseCase;
    this.getCalendarsUseCase = getCalendarsUseCase;
    this.getCalendarUseCase = getCalendarUseCase;
    this.updateCalendarUseCase = updateCalendarUseCase;
    this.deleteCalendarUseCase = deleteCalendarUseCase;
    this.getCalendarEventsUseCase = getCalendarEventsUseCase;
    this.linkGoogleCalendarsUseCase = linkGoogleCalendarsUseCase;
    this.setPrimaryGoogleCalendarUseCase = setPrimaryGoogleCalendarUseCase;
    this.linkGoogleAccountUseCase = linkGoogleAccountUseCase;
    this.unlinkGoogleAccountUseCase = unlinkGoogleAccountUseCase;
    this.initiateGoogleOAuthUseCase = initiateGoogleOAuthUseCase;
    this.handleGoogleOAuthCallbackUseCase = handleGoogleOAuthCallbackUseCase;
    this.refreshGoogleTokenUseCase = refreshGoogleTokenUseCase;
    this.listGoogleCalendarsUseCase = listGoogleCalendarsUseCase;
    this.selectGoogleCalendarsUseCase = selectGoogleCalendarsUseCase;
    this.createCalendarMappingUseCase = createCalendarMappingUseCase;
    this.getCalendarMappingUseCase = getCalendarMappingUseCase;
    this.listGoogleEventsUseCase = listGoogleEventsUseCase;
    this.getFreeBusyUseCase = getFreeBusyUseCase;
    this.getUnifiedCalendarUseCase = getUnifiedCalendarUseCase;
    this.getMonthlyCalendarUseCase = getMonthlyCalendarUseCase;
    this.syncCalendarUseCase = syncCalendarUseCase;
    this.backfillSyncUseCase = backfillSyncUseCase;
    this.startWatchUseCase = startWatchUseCase;
    this.stopWatchUseCase = stopWatchUseCase;
    this.getDiagnosticsUseCase = getDiagnosticsUseCase;
    this.getSharedCalendarViewUseCase = getSharedCalendarViewUseCase;
    this.googleCalendarAdapter = googleCalendarAdapter;
  }

  // ============================================================================
  // JAAIYE CALENDAR OPERATIONS
  // ============================================================================

  createCalendar = asyncHandler(async (req, res) => {
    const { CreateCalendarDTO } = require('./dto');
    const dto = new CreateCalendarDTO(req.body);
    const result = await this.createCalendarUseCase.execute(req.user.id, dto);

    return successResponse(
      res,
      { calendar: formatCalendarResponse(result.calendar) },
      201,
      'Calendar created successfully'
    );
  });

  getCalendars = asyncHandler(async (req, res) => {
    const result = await this.getCalendarsUseCase.execute(req.user.id);
    return successResponse(res, {
      calendars: result.calendars.map(formatCalendarResponse)
    });
  });

  getCalendar = asyncHandler(async (req, res) => {
    const result = await this.getCalendarUseCase.execute(req.params.id, req.user.id);
    return successResponse(res, {
      calendar: formatCalendarResponse(result.calendar)
    });
  });

  updateCalendar = asyncHandler(async (req, res) => {
    const { UpdateCalendarDTO } = require('./dto');
    const dto = new UpdateCalendarDTO(req.body);
    const result = await this.updateCalendarUseCase.execute(req.params.id, req.user.id, dto);

    return successResponse(res, {
      calendar: formatCalendarResponse(result.calendar)
    });
  });

  deleteCalendar = asyncHandler(async (req, res) => {
    await this.deleteCalendarUseCase.execute(req.body.id, req.user.id);
    return successResponse(res, null, 200, 'Calendar deleted successfully');
  });

  getCalendarEvents = asyncHandler(async (req, res) => {
    const result = await this.getCalendarEventsUseCase.execute(
      req.params.calendarId,
      req.user.id,
      req.query
    );
    return successResponse(res, result);
  });

  linkGoogleCalendars = asyncHandler(async (req, res) => {
    const { LinkGoogleCalendarsDTO } = require('./dto');
    const dto = new LinkGoogleCalendarsDTO(req.body);
    const result = await this.linkGoogleCalendarsUseCase.execute(req.params.id, req.user.id, dto);

    return successResponse(res, { google: result.google });
  });

  setPrimaryGoogleCalendar = asyncHandler(async (req, res) => {
    const { SetPrimaryGoogleCalendarDTO } = require('./dto');
    const dto = new SetPrimaryGoogleCalendarDTO(req.body);
    const result = await this.setPrimaryGoogleCalendarUseCase.execute(req.params.id, req.user.id, dto);

    return successResponse(res, { google: result.google });
  });

  // ============================================================================
  // GOOGLE OAUTH OPERATIONS
  // ============================================================================

  linkGoogleAccount = asyncHandler(async (req, res) => {
    const { LinkGoogleAccountDTO } = require('./dto');
    const dto = new LinkGoogleAccountDTO(req.body);
    const result = await this.linkGoogleAccountUseCase.execute(req.user.id, dto.serverAuthCode);

    return successResponse(res, null, 200, result.message);
  });

  unlinkGoogleAccount = asyncHandler(async (req, res) => {
    await this.unlinkGoogleAccountUseCase.execute(req.user.id);
    return successResponse(res, null, 200, 'Google account unlinked successfully');
  });

  /**
   * Initiate Google OAuth flow for Calendar linking
   * GET /api/v1/calendars/google/oauth/initiate
   * Query params: redirectUri (required)
   * Returns: { authUrl: string, state: string }
   */
  initiateGoogleOAuth = asyncHandler(async (req, res) => {
    const { redirectUri, mobileRedirectUri } = req.query;

    if (!redirectUri) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri query parameter is required'
      });
    }

    const result = await this.initiateGoogleOAuthUseCase.execute(req.user.id, redirectUri, mobileRedirectUri || null);
    return successResponse(res, result, 200, 'OAuth URL generated successfully');
  });

  /**
   * Handle Google OAuth callback
   * GET /api/v1/calendars/google/oauth/callback
   * Query params: code, state, redirectUri
   * Returns: HTML redirect page (if mobileRedirectUri) or JSON response (for API clients)
   */
  handleGoogleOAuthCallback = asyncHandler(async (req, res) => {
    const { code, state, redirectUri } = req.query;

    if (!code || !state) {
      // Check if this is a mobile app request (has mobileRedirectUri in state)
      try {
        const { mobileRedirectUri } = this.googleCalendarAdapter.extractOAuthState(state);
        if (mobileRedirectUri) {
          // Return HTML error page for mobile
          const fs = require('fs');
          const path = require('path');
          let errorHtml = fs.readFileSync(path.join(__dirname, './templates/oauth-error.html'), 'utf8');
          const errorRedirectUrl = `${mobileRedirectUri}?success=false&error=${encodeURIComponent('code and state query parameters are required')}`;
          errorHtml = errorHtml.replace('{{REDIRECT_URL}}', errorRedirectUrl);
          errorHtml = errorHtml.replace('{{ERROR_MESSAGE}}', 'Missing required parameters');
          return res.status(400).send(errorHtml);
        }
      } catch (e) {
        // Fall through to JSON response
      }

      return res.status(400).json({
        success: false,
        message: 'code and state query parameters are required'
      });
    }

    try {
      // redirectUri is optional - it's extracted from state parameter if included
      // If not in state, it can be provided as query param for backward compatibility
      const result = await this.handleGoogleOAuthCallbackUseCase.execute(code, state, redirectUri || null);

      // Check if mobileRedirectUri exists (mobile app flow)
      if (result.mobileRedirectUri) {
        // Return HTML redirect page for mobile app
        const fs = require('fs');
        const path = require('path');
        let successHtml = fs.readFileSync(path.join(__dirname, './templates/oauth-success.html'), 'utf8');
        const successRedirectUrl = `${result.mobileRedirectUri}?success=true&userId=${result.userId}&linked=true`;
        successHtml = successHtml.replace('{{REDIRECT_URL}}', successRedirectUrl);
        return res.status(200).send(successHtml);
      }

      // Return JSON response for API clients
      return successResponse(res, {
        message: result.message,
        linked: result.linked
      }, 200, result.message);
    } catch (error) {
      // Check if this is a mobile app request (has mobileRedirectUri in state)
      try {
        const { mobileRedirectUri, userId } = this.googleCalendarAdapter.extractOAuthState(state);
        if (mobileRedirectUri) {
          // Return HTML error page for mobile
          const fs = require('fs');
          const path = require('path');
          let errorHtml = fs.readFileSync(path.join(__dirname, './templates/oauth-error.html'), 'utf8');
          const errorMessage = error.message || 'An error occurred while linking your calendar';
          const errorRedirectUrl = `${mobileRedirectUri}?success=false&error=${encodeURIComponent(errorMessage)}${userId ? `&userId=${userId}` : ''}`;
          errorHtml = errorHtml.replace('{{REDIRECT_URL}}', errorRedirectUrl);
          errorHtml = errorHtml.replace('{{ERROR_MESSAGE}}', errorMessage);
          return res.status(error.statusCode || 400).send(errorHtml);
        }
      } catch (e) {
        // Fall through to JSON response
      }

      // Return JSON error for API clients
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Failed to link Google Calendar',
        error: error.message
      });
    }
  });

  refreshGoogleToken = asyncHandler(async (req, res) => {
    const result = await this.refreshGoogleTokenUseCase.execute(req.user.id);
    return successResponse(res, {
      message: result.message,
      expiresAt: result.expiresAt
    });
  });

  // ============================================================================
  // GOOGLE CALENDAR OPERATIONS
  // ============================================================================

  listGoogleCalendars = asyncHandler(async (req, res) => {
    const result = await this.listGoogleCalendarsUseCase.execute(req.user.id);
    return successResponse(res, {
      calendars: result.calendars,
      total: result.total
    });
  });

  selectGoogleCalendars = asyncHandler(async (req, res) => {
    const { SelectGoogleCalendarsDTO } = require('./dto');
    const dto = new SelectGoogleCalendarsDTO(req.body);
    const result = await this.selectGoogleCalendarsUseCase.execute(
      req.user.id,
      dto.action,
      dto.calendarId
    );

    return successResponse(res, {
      selectedCalendarIds: result.selectedCalendarIds,
      message: result.message,
      action: result.action,
      calendarId: result.calendarId
    });
  });

  createCalendarMapping = asyncHandler(async (req, res) => {
    const { CreateCalendarMappingDTO } = require('./dto');
    const dto = new CreateCalendarMappingDTO(req.body);
    const result = await this.createCalendarMappingUseCase.execute(
      req.user.id,
      dto.googleCalendarId,
      dto.jaaiyeCalendarId
    );

    return successResponse(res, { mappings: result.mappings }, 201, 'Calendar mapping created successfully');
  });

  getCalendarMapping = asyncHandler(async (req, res) => {
    const result = await this.getCalendarMappingUseCase.execute(req.user.id);
    return successResponse(res, { mappings: result.mappings });
  });

  listGoogleEvents = asyncHandler(async (req, res) => {
    const { ListGoogleEventsDTO } = require('./dto');
    const dto = new ListGoogleEventsDTO(req.body);
    const result = await this.listGoogleEventsUseCase.execute(req.user.id, dto.timeMin, dto.timeMax, {
      includeAllDay: dto.includeAllDay,
      maxResults: dto.maxResults,
      viewType: dto.viewType
    });

    return successResponse(res, result);
  });

  getFreeBusy = asyncHandler(async (req, res) => {
    const { GetFreeBusyDTO } = require('./dto');
    const dto = new GetFreeBusyDTO(req.body);
    const result = await this.getFreeBusyUseCase.execute(
      req.user.id,
      dto.timeMin,
      dto.timeMax,
      dto.calendarIds
    );

    return successResponse(res, { freeBusy: result.freeBusy });
  });

  // ============================================================================
  // UNIFIED CALENDAR OPERATIONS
  // ============================================================================

  getUnifiedCalendar = asyncHandler(async (req, res) => {
    const { GetUnifiedCalendarDTO } = require('./dto');
    const dto = new GetUnifiedCalendarDTO(req.query);
    const result = await this.getUnifiedCalendarUseCase.execute(
      req.user.id,
      dto.timeMin,
      dto.timeMax,
      {
        includeJaaiye: dto.includeJaaiye,
        includeGoogle: dto.includeGoogle,
        viewType: dto.viewType
      }
    );

    return successResponse(res, result);
  });

  getMonthlyCalendar = asyncHandler(async (req, res) => {
    const { GetMonthlyCalendarDTO } = require('./dto');
    const dto = new GetMonthlyCalendarDTO(req.params, req.query);
    const result = await this.getMonthlyCalendarUseCase.execute(
      req.user.id,
      dto.year,
      dto.month,
      {
        includeJaaiye: dto.includeJaaiye,
        includeGoogle: dto.includeGoogle
      }
    );

    return successResponse(res, result);
  });

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  syncCalendar = asyncHandler(async (req, res) => {
    const result = await this.syncCalendarUseCase.execute(req.user.id);
    return successResponse(res, result, 200, 'Calendar sync completed');
  });

  backfillSync = asyncHandler(async (req, res) => {
    const { BackfillSyncDTO } = require('./dto');
    const dto = new BackfillSyncDTO(req.body);
    const result = await this.backfillSyncUseCase.execute(
      req.user.id,
      dto.calendarId,
      dto.daysBack
    );

    return successResponse(res, result, 200, 'Backfill sync completed');
  });

  // ============================================================================
  // WATCH OPERATIONS
  // ============================================================================

  startWatch = asyncHandler(async (req, res) => {
    const { StartWatchDTO } = require('./dto');
    const dto = new StartWatchDTO(req.body);
    const result = await this.startWatchUseCase.execute(req.user.id, dto.calendarId);

    return successResponse(res, result, 201, 'Watch started successfully');
  });

  stopWatch = asyncHandler(async (req, res) => {
    const { StopWatchDTO } = require('./dto');
    const dto = new StopWatchDTO(req.body);
    await this.stopWatchUseCase.execute(req.user.id, dto.calendarId);

    return successResponse(res, null, 200, 'Watch stopped successfully');
  });

  // ============================================================================
  // UTILITIES
  // ============================================================================

  getDiagnostics = asyncHandler(async (req, res) => {
    const result = await this.getDiagnosticsUseCase.execute(req.user.id);
    return successResponse(res, result);
  });

  // ============================================================================
  // SHARED CALENDAR VIEW
  // ============================================================================

  getSharedCalendarView = asyncHandler(async (req, res) => {
    const { GetSharedCalendarViewDTO } = require('./dto');
    const dto = new GetSharedCalendarViewDTO(req.body);
    const result = await this.getSharedCalendarViewUseCase.execute(
      req.user.id,
      dto.userIds,
      dto.timeMin,
      dto.timeMax
    );

    return successResponse(res, result);
  });
}

module.exports = CalendarController;

