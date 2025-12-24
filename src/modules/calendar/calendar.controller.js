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
    completeGoogleOAuthUseCase,
    handleOAuthRedirectUseCase,
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
    this.completeGoogleOAuthUseCase = completeGoogleOAuthUseCase;
    this.handleOAuthRedirectUseCase = handleOAuthRedirectUseCase;
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
    const { mobileRedirectUri } = req.query;

    if (!mobileRedirectUri) {
      return res.status(400).json({
        success: false,
        message: 'mobileRedirectUri query parameter is required (e.g., jaaiye://oauthredirect)'
      });
    }

    const result = await this.initiateGoogleOAuthUseCase.execute(req.user.id, mobileRedirectUri);
    return successResponse(res, result, 200, 'OAuth URL generated successfully');
  });

  /**
   * Handle OAuth redirect from Google
   * GET /oauth/redirect
   * Query params: code, state
   * Public endpoint - Google redirects here after user authorization
   * Processes OAuth and redirects to mobile app deep link
   */
  handleOAuthRedirect = asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
      // Redirect to mobile app with error
      const errorMessage = encodeURIComponent('code and state query parameters are required');
      // Try to extract mobileRedirectUri from state to redirect
      let mobileRedirectUri = 'jaaiye://oauthredirect'; // Default fallback
      try {
        const extracted = this.googleCalendarAdapter.extractOAuthState(state);
        if (extracted.mobileRedirectUri) {
          mobileRedirectUri = extracted.mobileRedirectUri;
        }
      } catch (e) {
        // Use default
      }
      return res.redirect(`${mobileRedirectUri}?success=false&error=${errorMessage}`);
    }

    try {
      // Backend redirect URI (must match what was used in generateOAuthUrl)
      const backendRedirectUri = process.env.GOOGLE_REDIRECT_URI ||
        `${req.protocol}://${req.get('host')}/oauth/redirect`;

      const result = await this.handleOAuthRedirectUseCase.execute(code, state, backendRedirectUri);

      // Redirect to mobile app with success
      const successRedirectUrl = `${result.mobileRedirectUri}?success=true&userId=${result.userId}&linked=true`;
      return res.redirect(successRedirectUrl);
    } catch (error) {
      // Try to extract mobileRedirectUri from state to redirect with error
      let mobileRedirectUri = 'jaaiye://oauthredirect'; // Default fallback
      let userId = null;
      try {
        const extracted = this.googleCalendarAdapter.extractOAuthState(state);
        if (extracted.mobileRedirectUri) {
          mobileRedirectUri = extracted.mobileRedirectUri;
        }
        userId = extracted.userId;
      } catch (e) {
        // Use default
      }

      const errorMessage = encodeURIComponent(error.message || 'An error occurred while linking your calendar');
      const errorRedirectUrl = `${mobileRedirectUri}?success=false&error=${errorMessage}${userId ? `&userId=${userId}` : ''}`;
      return res.redirect(errorRedirectUrl);
    }
  });

  /**
   * Complete Google OAuth flow
   * POST /api/v1/calendars/google/oauth/complete
   * Body: { code, state, mobileRedirectUri }
   * Called by mobile app after receiving OAuth callback from Google
   * (Alternative flow - kept for backward compatibility)
   */
  completeGoogleOAuth = asyncHandler(async (req, res) => {
    const { code, state, mobileRedirectUri } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'code and state are required'
      });
    }

    if (!mobileRedirectUri) {
      return res.status(400).json({
        success: false,
        message: 'mobileRedirectUri is required (must match the one used in initiate)'
      });
    }

    const result = await this.completeGoogleOAuthUseCase.execute(code, state, mobileRedirectUri);
    return successResponse(res, result, 200, result.message);
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

