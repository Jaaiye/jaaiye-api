/**
 * Ticket Domain Container
 * Dependency Injection container
 */

const { TicketRepository } = require('../infrastructure/persistence/repositories');
const { QRCodeAdapter, EmailAdapter } = require('../infrastructure/adapters');
const {
  CreateTicketUseCase,
  GetMyTicketsUseCase,
  GetActiveTicketsUseCase,
  GetEventTicketsUseCase,
  GetTicketByIdUseCase,
  ScanTicketUseCase,
  VerifyAndUseTicketUseCase,
  CancelTicketUseCase
} = require('../application/use-cases');
const TicketController = require('../presentation/controllers/TicketController');
const TicketRoutes = require('../presentation/routes/ticket.routes');

// Import shared dependencies
const { EventRepository } = require('../../event/infrastructure/persistence/repositories');
const { UserRepository } = require('../../shared/infrastructure/persistence/repositories');

class TicketContainer {
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
    this._scanTicketUseCase = null;
    this._verifyAndUseTicketUseCase = null;
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

  // Use Cases
  getCreateTicketUseCase() {
    if (!this._createTicketUseCase) {
      this._createTicketUseCase = new CreateTicketUseCase({
        ticketRepository: this.getTicketRepository(),
        eventRepository: this.getEventRepository(),
        userRepository: this.getUserRepository(),
        qrCodeAdapter: this.getQRCodeAdapter(),
        emailAdapter: this.getEmailAdapter()
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

  getScanTicketUseCase() {
    if (!this._scanTicketUseCase) {
      this._scanTicketUseCase = new ScanTicketUseCase({
        ticketRepository: this.getTicketRepository(),
        qrCodeAdapter: this.getQRCodeAdapter()
      });
    }
    return this._scanTicketUseCase;
  }

  getVerifyAndUseTicketUseCase() {
    if (!this._verifyAndUseTicketUseCase) {
      this._verifyAndUseTicketUseCase = new VerifyAndUseTicketUseCase({
        ticketRepository: this.getTicketRepository(),
        qrCodeAdapter: this.getQRCodeAdapter()
      });
    }
    return this._verifyAndUseTicketUseCase;
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
        scanTicketUseCase: this.getScanTicketUseCase(),
        verifyAndUseTicketUseCase: this.getVerifyAndUseTicketUseCase(),
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

module.exports = new TicketContainer();

