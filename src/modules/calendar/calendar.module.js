/**
 * Calendar Domain Container
 * Dependency Injection container for Calendar domain
 */

const { UserRepository } = require('../common/repositories');
const { CalendarRepository } = require('./repositories');
const { EventRepository } = require('../event/repositories');
const { GoogleCalendarAdapter, CalendarSyncAdapter, CalendarService } = require('./services');
// CalendarService removed - functionality moved to use cases
const {
  CreateCalendarUseCase,
  GetCalendarsUseCase,
  GetCalendarUseCase,
  UpdateCalendarUseCase,
  DeleteCalendarUseCase,
  GetCalendarEventsUseCase,
  LinkGoogleCalendarsUseCase,
  SetPrimaryGoogleCalendarUseCase,
  LinkGoogleAccountUseCase,
  UnlinkGoogleAccountUseCase,
  RefreshGoogleTokenUseCase,
  ListGoogleCalendarsUseCase,
  SelectGoogleCalendarsUseCase,
  CreateCalendarMappingUseCase,
  GetCalendarMappingUseCase,
  ListGoogleEventsUseCase,
  GetFreeBusyUseCase,
  GetUnifiedCalendarUseCase,
  GetMonthlyCalendarUseCase,
  SyncCalendarUseCase,
  BackfillSyncUseCase,
  StartWatchUseCase,
  StopWatchUseCase,
  GetDiagnosticsUseCase,
  GetSharedCalendarViewUseCase,
  InitiateGoogleOAuthUseCase,
  CompleteGoogleOAuthUseCase,
  HandleOAuthRedirectUseCase
} = require('./use-cases');
const CalendarController = require('./calendar.controller');
const createCalendarRoutes = require('./calendar.routes');

class CalendarModule {
  constructor() {
    this._instances = {};
  }

  // ============================================================================
  // REPOSITORIES
  // ============================================================================

  getUserRepository() {
    if (!this._instances.userRepository) {
      this._instances.userRepository = new UserRepository();
    }
    return this._instances.userRepository;
  }

  getCalendarRepository() {
    if (!this._instances.calendarRepository) {
      this._instances.calendarRepository = new CalendarRepository();
    }
    return this._instances.calendarRepository;
  }

  getEventRepository() {
    if (!this._instances.eventRepository) {
      this._instances.eventRepository = new EventRepository();
    }
    return this._instances.eventRepository;
  }

  // ============================================================================
  // ADAPTERS
  // ============================================================================

  getGoogleCalendarAdapter() {
    if (!this._instances.googleCalendarAdapter) {
      this._instances.googleCalendarAdapter = new GoogleCalendarAdapter({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.googleCalendarAdapter;
  }

  getCalendarSyncAdapter() {
    if (!this._instances.calendarSyncAdapter) {
      const { TicketRepository } = require('../ticket/repositories');
      this._instances.calendarSyncAdapter = new CalendarSyncAdapter({
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        userRepository: this.getUserRepository(),
        eventRepository: this.getEventRepository(),
        ticketRepository: new TicketRepository()
      });
    }
    return this._instances.calendarSyncAdapter;
  }

  getCalendarService() {
    if (!this._instances.calendarService) {
      this._instances.calendarService = new CalendarService({
        userRepository: this.getUserRepository(),
        calendarRepository: this.getCalendarRepository(),
        eventRepository: this.getEventRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.calendarService;
  }

  // ============================================================================
  // USE CASES - JAAIYE CALENDAR
  // ============================================================================

  getCreateCalendarUseCase() {
    if (!this._instances.createCalendarUseCase) {
      this._instances.createCalendarUseCase = new CreateCalendarUseCase({
        calendarRepository: this.getCalendarRepository(),
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.createCalendarUseCase;
  }

  getGetCalendarsUseCase() {
    if (!this._instances.getCalendarsUseCase) {
      this._instances.getCalendarsUseCase = new GetCalendarsUseCase({
        calendarRepository: this.getCalendarRepository()
      });
    }
    return this._instances.getCalendarsUseCase;
  }

  getGetCalendarUseCase() {
    if (!this._instances.getCalendarUseCase) {
      this._instances.getCalendarUseCase = new GetCalendarUseCase({
        calendarRepository: this.getCalendarRepository()
      });
    }
    return this._instances.getCalendarUseCase;
  }

  getUpdateCalendarUseCase() {
    if (!this._instances.updateCalendarUseCase) {
      this._instances.updateCalendarUseCase = new UpdateCalendarUseCase({
        calendarRepository: this.getCalendarRepository()
      });
    }
    return this._instances.updateCalendarUseCase;
  }

  getDeleteCalendarUseCase() {
    if (!this._instances.deleteCalendarUseCase) {
      this._instances.deleteCalendarUseCase = new DeleteCalendarUseCase({
        calendarRepository: this.getCalendarRepository(),
        eventRepository: this.getEventRepository()
      });
    }
    return this._instances.deleteCalendarUseCase;
  }

  getGetCalendarEventsUseCase() {
    if (!this._instances.getCalendarEventsUseCase) {
      this._instances.getCalendarEventsUseCase = new GetCalendarEventsUseCase({
        calendarRepository: this.getCalendarRepository(),
        eventRepository: this.getEventRepository()
      });
    }
    return this._instances.getCalendarEventsUseCase;
  }

  getLinkGoogleCalendarsUseCase() {
    if (!this._instances.linkGoogleCalendarsUseCase) {
      this._instances.linkGoogleCalendarsUseCase = new LinkGoogleCalendarsUseCase({
        calendarRepository: this.getCalendarRepository()
      });
    }
    return this._instances.linkGoogleCalendarsUseCase;
  }

  getSetPrimaryGoogleCalendarUseCase() {
    if (!this._instances.setPrimaryGoogleCalendarUseCase) {
      this._instances.setPrimaryGoogleCalendarUseCase = new SetPrimaryGoogleCalendarUseCase({
        calendarRepository: this.getCalendarRepository()
      });
    }
    return this._instances.setPrimaryGoogleCalendarUseCase;
  }

  // ============================================================================
  // USE CASES - GOOGLE OAUTH
  // ============================================================================

  getLinkGoogleAccountUseCase() {
    if (!this._instances.linkGoogleAccountUseCase) {
      this._instances.linkGoogleAccountUseCase = new LinkGoogleAccountUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        calendarSyncAdapter: this.getCalendarSyncAdapter()
      });
    }
    return this._instances.linkGoogleAccountUseCase;
  }

  getUnlinkGoogleAccountUseCase() {
    if (!this._instances.unlinkGoogleAccountUseCase) {
      this._instances.unlinkGoogleAccountUseCase = new UnlinkGoogleAccountUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.unlinkGoogleAccountUseCase;
  }

  getInitiateGoogleOAuthUseCase() {
    if (!this._instances.initiateGoogleOAuthUseCase) {
      this._instances.initiateGoogleOAuthUseCase = new InitiateGoogleOAuthUseCase({
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.initiateGoogleOAuthUseCase;
  }

  getCompleteGoogleOAuthUseCase() {
    if (!this._instances.completeGoogleOAuthUseCase) {
      this._instances.completeGoogleOAuthUseCase = new CompleteGoogleOAuthUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        calendarSyncAdapter: this.getCalendarSyncAdapter()
      });
    }
    return this._instances.completeGoogleOAuthUseCase;
  }

  getHandleOAuthRedirectUseCase() {
    if (!this._instances.handleOAuthRedirectUseCase) {
      this._instances.handleOAuthRedirectUseCase = new HandleOAuthRedirectUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        calendarSyncAdapter: this.getCalendarSyncAdapter()
      });
    }
    return this._instances.handleOAuthRedirectUseCase;
  }

  getRefreshGoogleTokenUseCase() {
    if (!this._instances.refreshGoogleTokenUseCase) {
      this._instances.refreshGoogleTokenUseCase = new RefreshGoogleTokenUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.refreshGoogleTokenUseCase;
  }

  // ============================================================================
  // USE CASES - GOOGLE CALENDAR
  // ============================================================================

  getListGoogleCalendarsUseCase() {
    if (!this._instances.listGoogleCalendarsUseCase) {
      this._instances.listGoogleCalendarsUseCase = new ListGoogleCalendarsUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.listGoogleCalendarsUseCase;
  }

  getSelectGoogleCalendarsUseCase() {
    if (!this._instances.selectGoogleCalendarsUseCase) {
      this._instances.selectGoogleCalendarsUseCase = new SelectGoogleCalendarsUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.selectGoogleCalendarsUseCase;
  }

  getCreateCalendarMappingUseCase() {
    if (!this._instances.createCalendarMappingUseCase) {
      this._instances.createCalendarMappingUseCase = new CreateCalendarMappingUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.createCalendarMappingUseCase;
  }

  getGetCalendarMappingUseCase() {
    if (!this._instances.getCalendarMappingUseCase) {
      this._instances.getCalendarMappingUseCase = new GetCalendarMappingUseCase();
    }
    return this._instances.getCalendarMappingUseCase;
  }

  getListGoogleEventsUseCase() {
    if (!this._instances.listGoogleEventsUseCase) {
      this._instances.listGoogleEventsUseCase = new ListGoogleEventsUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.listGoogleEventsUseCase;
  }

  getGetFreeBusyUseCase() {
    if (!this._instances.getFreeBusyUseCase) {
      this._instances.getFreeBusyUseCase = new GetFreeBusyUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.getFreeBusyUseCase;
  }

  // ============================================================================
  // USE CASES - UNIFIED CALENDAR
  // ============================================================================

  getGetUnifiedCalendarUseCase() {
    if (!this._instances.getUnifiedCalendarUseCase) {
      this._instances.getUnifiedCalendarUseCase = new GetUnifiedCalendarUseCase({
        calendarService: this.getCalendarService()
      });
    }
    return this._instances.getUnifiedCalendarUseCase;
  }

  getGetMonthlyCalendarUseCase() {
    if (!this._instances.getMonthlyCalendarUseCase) {
      this._instances.getMonthlyCalendarUseCase = new GetMonthlyCalendarUseCase({
        calendarService: this.getCalendarService()
      });
    }
    return this._instances.getMonthlyCalendarUseCase;
  }

  // ============================================================================
  // USE CASES - SYNC
  // ============================================================================

  getSyncCalendarUseCase() {
    if (!this._instances.syncCalendarUseCase) {
      this._instances.syncCalendarUseCase = new SyncCalendarUseCase({
        calendarSyncAdapter: this.getCalendarSyncAdapter()
      });
    }
    return this._instances.syncCalendarUseCase;
  }

  getBackfillSyncUseCase() {
    if (!this._instances.backfillSyncUseCase) {
      this._instances.backfillSyncUseCase = new BackfillSyncUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.backfillSyncUseCase;
  }

  // ============================================================================
  // USE CASES - WATCH
  // ============================================================================

  getStartWatchUseCase() {
    if (!this._instances.startWatchUseCase) {
      this._instances.startWatchUseCase = new StartWatchUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.startWatchUseCase;
  }

  getStopWatchUseCase() {
    if (!this._instances.stopWatchUseCase) {
      this._instances.stopWatchUseCase = new StopWatchUseCase({
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.stopWatchUseCase;
  }

  // ============================================================================
  // USE CASES - UTILITIES
  // ============================================================================

  getGetDiagnosticsUseCase() {
    if (!this._instances.getDiagnosticsUseCase) {
      this._instances.getDiagnosticsUseCase = new GetDiagnosticsUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.getDiagnosticsUseCase;
  }

  getGetSharedCalendarViewUseCase() {
    if (!this._instances.getSharedCalendarViewUseCase) {
      const { EventRepository, EventParticipantRepository } = require('../event/repositories');
      this._instances.getSharedCalendarViewUseCase = new GetSharedCalendarViewUseCase({
        userRepository: this.getUserRepository(),
        calendarRepository: this.getCalendarRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        eventRepository: new EventRepository(),
        eventParticipantRepository: new EventParticipantRepository()
      });
    }
    return this._instances.getSharedCalendarViewUseCase;
  }

  // ============================================================================
  // CONTROLLER
  // ============================================================================

  getCalendarController() {
    if (!this._instances.calendarController) {
      this._instances.calendarController = new CalendarController({
        createCalendarUseCase: this.getCreateCalendarUseCase(),
        getCalendarsUseCase: this.getGetCalendarsUseCase(),
        getCalendarUseCase: this.getGetCalendarUseCase(),
        updateCalendarUseCase: this.getUpdateCalendarUseCase(),
        deleteCalendarUseCase: this.getDeleteCalendarUseCase(),
        getCalendarEventsUseCase: this.getGetCalendarEventsUseCase(),
        linkGoogleCalendarsUseCase: this.getLinkGoogleCalendarsUseCase(),
        setPrimaryGoogleCalendarUseCase: this.getSetPrimaryGoogleCalendarUseCase(),
        linkGoogleAccountUseCase: this.getLinkGoogleAccountUseCase(),
        unlinkGoogleAccountUseCase: this.getUnlinkGoogleAccountUseCase(),
        initiateGoogleOAuthUseCase: this.getInitiateGoogleOAuthUseCase(),
        completeGoogleOAuthUseCase: this.getCompleteGoogleOAuthUseCase(),
        handleOAuthRedirectUseCase: this.getHandleOAuthRedirectUseCase(),
        refreshGoogleTokenUseCase: this.getRefreshGoogleTokenUseCase(),
        listGoogleCalendarsUseCase: this.getListGoogleCalendarsUseCase(),
        selectGoogleCalendarsUseCase: this.getSelectGoogleCalendarsUseCase(),
        createCalendarMappingUseCase: this.getCreateCalendarMappingUseCase(),
        getCalendarMappingUseCase: this.getGetCalendarMappingUseCase(),
        listGoogleEventsUseCase: this.getListGoogleEventsUseCase(),
        getFreeBusyUseCase: this.getGetFreeBusyUseCase(),
        getUnifiedCalendarUseCase: this.getGetUnifiedCalendarUseCase(),
        getMonthlyCalendarUseCase: this.getGetMonthlyCalendarUseCase(),
        syncCalendarUseCase: this.getSyncCalendarUseCase(),
        backfillSyncUseCase: this.getBackfillSyncUseCase(),
        startWatchUseCase: this.getStartWatchUseCase(),
        stopWatchUseCase: this.getStopWatchUseCase(),
        getDiagnosticsUseCase: this.getGetDiagnosticsUseCase(),
        getSharedCalendarViewUseCase: this.getGetSharedCalendarViewUseCase(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.calendarController;
  }

  // ============================================================================
  // ROUTES
  // ============================================================================

  getCalendarRoutes() {
    return createCalendarRoutes({
      calendarController: this.getCalendarController()
    });
  }
}

// Export singleton instance
const calendarContainer = new CalendarModule();
module.exports = calendarContainer;

