/**
 * Ticket Domain Container
 * Dependency Injection container
 */

const { TicketRepository } = require('./repositories');
const { QRCodeAdapter, EmailAdapter } = require('./services');
const {
  CreateTicketUseCase,
  GetMyTicketsUseCase,
  GetActiveTicketsUseCase,
  GetEventTicketsUseCase,
  GetTicketByIdUseCase,
  GetTicketByPublicIdUseCase,
  ScanAndVerifyTicketUseCase,
  CancelTicketUseCase
} = require('./use-cases');
const TicketController = require('./ticket.controller');
const TicketRoutes = require('./ticket.routes');

// Import shared dependencies
const { EventRepository } = require('../event/repositories');
const { EventParticipantRepository } = require('../event/repositories');
const { UserRepository } = require('../common/repositories');
const CalendarSyncService = require('../event/services/CalendarSyncService');
const { GoogleCalendarAdapter } = require('../event/services');
const { CalendarRepository } = require('../calendar/repositories');

class TicketModule {
  constructor() {
    // Repositories
    this._ticketRepository = null;
    this._eventRepository = null;
    this._userRepository = null;

    // Adapters
    this._qrCodeAdapter = null;
    this._emailAdapter = null;

    // Use Cases
    this._createTicketUseCase = null;
    this._getMyTicketsUseCase = null;
    this._getActiveTicketsUseCase = null;
    this._getEventTicketsUseCase = null;
    this._getTicketByIdUseCase = null;
    this._getTicketByPublicIdUseCase = null;
    this._scanAndVerifyTicketUseCase = null;
    this._cancelTicketUseCase = null;

    // Controller
    this._ticketController = null;

    // Routes
    this._ticketRoutes = null;
  }

  // Repositories
  getTicketRepository() {
    if (!this._ticketRepository) {
      this._ticketRepository = new TicketRepository();
    }
    return this._ticketRepository;
  }

  getEventRepository() {
    if (!this._eventRepository) {
      this._eventRepository = new EventRepository();
    }
    return this._eventRepository;
  }

  getUserRepository() {
    if (!this._userRepository) {
      this._userRepository = new UserRepository();
    }
    return this._userRepository;
  }

  // Adapters
  getQRCodeAdapter() {
    if (!this._qrCodeAdapter) {
      this._qrCodeAdapter = new QRCodeAdapter();
    }
    return this._qrCodeAdapter;
  }

  getEmailAdapter() {
    if (!this._emailAdapter) {
      this._emailAdapter = new EmailAdapter();
    }
    return this._emailAdapter;
  }

  // Shared services
  getEventParticipantRepository() {
    if (!this._eventParticipantRepository) {
      this._eventParticipantRepository = new EventParticipantRepository();
    }
    return this._eventParticipantRepository;
  }

  getCalendarRepository() {
    if (!this._calendarRepository) {
      this._calendarRepository = new CalendarRepository();
    }
    return this._calendarRepository;
  }

  getGoogleCalendarAdapter() {
    if (!this._googleCalendarAdapter) {
      this._googleCalendarAdapter = new GoogleCalendarAdapter({
        userRepository: this.getUserRepository()
      });
    }
    return this._googleCalendarAdapter;
  }

  getCalendarSyncService() {
    if (!this._calendarSyncService) {
      this._calendarSyncService = new CalendarSyncService({
        eventParticipantRepository: this.getEventParticipantRepository(),
        calendarRepository: this.getCalendarRepository(),
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._calendarSyncService;
  }

  // Use Cases
  getCreateTicketUseCase() {
    if (!this._createTicketUseCase) {
      this._createTicketUseCase = new CreateTicketUseCase({
        ticketRepository: this.getTicketRepository(),
        eventRepository: this.getEventRepository(),
        userRepository: this.getUserRepository(),
        qrCodeAdapter: this.getQRCodeAdapter(),
        emailAdapter: this.getEmailAdapter(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        calendarSyncService: this.getCalendarSyncService()
      });
    }
    return this._createTicketUseCase;
  }

  getGetMyTicketsUseCase() {
    if (!this._getMyTicketsUseCase) {
      this._getMyTicketsUseCase = new GetMyTicketsUseCase({
        ticketRepository: this.getTicketRepository()
      });
    }
    return this._getMyTicketsUseCase;
  }

  getGetActiveTicketsUseCase() {
    if (!this._getActiveTicketsUseCase) {
      this._getActiveTicketsUseCase = new GetActiveTicketsUseCase({
        ticketRepository: this.getTicketRepository()
      });
    }
    return this._getActiveTicketsUseCase;
  }

  getGetEventTicketsUseCase() {
    if (!this._getEventTicketsUseCase) {
      this._getEventTicketsUseCase = new GetEventTicketsUseCase({
        ticketRepository: this.getTicketRepository()
      });
    }
    return this._getEventTicketsUseCase;
  }

  getGetTicketByIdUseCase() {
    if (!this._getTicketByIdUseCase) {
      this._getTicketByIdUseCase = new GetTicketByIdUseCase({
        ticketRepository: this.getTicketRepository()
      });
    }
    return this._getTicketByIdUseCase;
  }

  getGetTicketByPublicIdUseCase() {
    if (!this._getTicketByPublicIdUseCase) {
      this._getTicketByPublicIdUseCase = new GetTicketByPublicIdUseCase({
        ticketRepository: this.getTicketRepository()
      });
    }
    return this._getTicketByPublicIdUseCase;
  }

  getScanAndVerifyTicketUseCase() {
    if (!this._scanAndVerifyTicketUseCase) {
      this._scanAndVerifyTicketUseCase = new ScanAndVerifyTicketUseCase({
        ticketRepository: this.getTicketRepository(),
        qrCodeAdapter: this.getQRCodeAdapter()
      });
    }
    return this._scanAndVerifyTicketUseCase;
  }

  getCancelTicketUseCase() {
    if (!this._cancelTicketUseCase) {
      this._cancelTicketUseCase = new CancelTicketUseCase({
        ticketRepository: this.getTicketRepository()
      });
    }
    return this._cancelTicketUseCase;
  }

  // Controller
  getTicketController() {
    if (!this._ticketController) {
      this._ticketController = new TicketController({
        createTicketUseCase: this.getCreateTicketUseCase(),
        getMyTicketsUseCase: this.getGetMyTicketsUseCase(),
        getActiveTicketsUseCase: this.getGetActiveTicketsUseCase(),
        getEventTicketsUseCase: this.getGetEventTicketsUseCase(),
        getTicketByIdUseCase: this.getGetTicketByIdUseCase(),
        getTicketByPublicIdUseCase: this.getGetTicketByPublicIdUseCase(),
        scanAndVerifyTicketUseCase: this.getScanAndVerifyTicketUseCase(),
        cancelTicketUseCase: this.getCancelTicketUseCase()
      });
    }
    return this._ticketController;
  }

  // Routes
  getTicketRoutes() {
    if (!this._ticketRoutes) {
      this._ticketRoutes = new TicketRoutes({
        ticketController: this.getTicketController()
      });
    }
    return this._ticketRoutes.getRoutes();
  }
}

module.exports = new TicketModule();

