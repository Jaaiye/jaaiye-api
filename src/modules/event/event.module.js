/**
 * Event Domain Container
 * Dependency Injection container for Event domain
 */

const { UserRepository } = require('../common/repositories');
const { CalendarRepository } = require('../calendar/repositories');
const { EventRepository, EventParticipantRepository } = require('./repositories');
const EventTeamRepository = require('./repositories/EventTeamRepository');
const { GroupRepository } = require('../group/repositories');
const { WalletRepository, WalletLedgerEntryRepository } = require('../wallet/repositories');
const { TicketRepository } = require('../ticket/repositories');
const { TransactionRepository } = require('../payment/repositories');
const WalletRefundService = require('../wallet/services/WalletRefundService');
const WalletNotificationService = require('../wallet/services/WalletNotificationService');
const WalletEmailAdapter = require('../wallet/services/WalletEmailAdapter');
const { FirebaseAdapter } = require('../common/services');
const { GoogleCalendarAdapter, CloudinaryAdapter } = require('./services');
const { GoogleCalendarAdapter: CalendarGoogleCalendarAdapter } = require('../calendar/services');
const { NotificationAdapter } = require('./services');
const CalendarSyncService = require('./services/CalendarSyncService');
const { SendNotificationUseCase } = require('../notification/use-cases');
const { NotificationRepository } = require('../notification/repositories');
const { PushNotificationAdapter } = require('../notification/services');
const {
  CreateEventUseCase,
  GetEventUseCase,
  UpdateEventUseCase,
  DeleteEventUseCase,
  ListEventsUseCase,
  AddParticipantsUseCase,
  UpdateParticipantStatusUseCase,
  RemoveParticipantUseCase,
  PublishEventUseCase,
  UnpublishEventUseCase,
  CancelEventUseCase,
  UpdateTicketTypeUseCase,
  DeleteTicketTypeUseCase,
  GetTicketTypesUseCase,
  AddEventTeamMemberUseCase,
  UpdateEventTeamMemberUseCase,
  RemoveEventTeamMemberUseCase,
  GetEventTeamUseCase,
  GetEventAnalyticsUseCase,
  GetTeamEventsUseCase,
  ListTeamInvitationsUseCase
} = require('./use-cases');
const { ResendEventTicketsUseCase } = require('../ticket/use-cases');
const EventController = require('./event.controller');
const createEventRoutes = require('./event.routes');

class EventModule {
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

  getEventParticipantRepository() {
    if (!this._instances.eventParticipantRepository) {
      this._instances.eventParticipantRepository = new EventParticipantRepository();
    }
    return this._instances.eventParticipantRepository;
  }

  getEventTeamRepository() {
    if (!this._instances.eventTeamRepository) {
      this._instances.eventTeamRepository = new EventTeamRepository();
    }
    return this._instances.eventTeamRepository;
  }

  getGroupRepository() {
    if (!this._instances.groupRepository) {
      this._instances.groupRepository = new GroupRepository();
    }
    return this._instances.groupRepository;
  }

  getWalletRepository() {
    if (!this._instances.walletRepository) {
      this._instances.walletRepository = new WalletRepository();
    }
    return this._instances.walletRepository;
  }

  getFirebaseAdapter() {
    if (!this._instances.firebaseAdapter) {
      this._instances.firebaseAdapter = new FirebaseAdapter();
    }
    return this._instances.firebaseAdapter;
  }

  // ============================================================================
  // ADAPTERS
  // ============================================================================

  getNotificationAdapter() {
    if (!this._instances.notificationAdapter) {
      // Get dependencies from Notification domain
      const notificationRepository = new NotificationRepository();
      const { PushNotificationAdapter, FirebaseAdapter, DeviceTokenAdapter } = require('../notification/services');
      const firebaseAdapter = new FirebaseAdapter();
      const deviceTokenAdapter = new DeviceTokenAdapter();
      const pushNotificationAdapter = new PushNotificationAdapter({
        firebaseAdapter,
        deviceTokenAdapter
      });
      const sendNotificationUseCase = new SendNotificationUseCase({
        notificationRepository,
        pushNotificationAdapter
      });

      this._instances.notificationAdapter = new NotificationAdapter({
        sendNotificationUseCase
      });
    }
    return this._instances.notificationAdapter;
  }

  getGoogleCalendarAdapter() {
    if (!this._instances.googleCalendarAdapter) {
      this._instances.googleCalendarAdapter = new GoogleCalendarAdapter({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.googleCalendarAdapter;
  }

  getCloudinaryAdapter() {
    if (!this._instances.cloudinaryAdapter) {
      this._instances.cloudinaryAdapter = new CloudinaryAdapter();
    }
    return this._instances.cloudinaryAdapter;
  }

  getCalendarSyncService() {
    if (!this._instances.calendarSyncService) {
      // Use calendar module's GoogleCalendarAdapter (requires userRepository)
      const calendarGoogleAdapter = new CalendarGoogleCalendarAdapter({
        userRepository: this.getUserRepository()
      });

      this._instances.calendarSyncService = new CalendarSyncService({
        eventParticipantRepository: this.getEventParticipantRepository(),
        calendarRepository: this.getCalendarRepository(),
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: calendarGoogleAdapter
      });
    }
    return this._instances.calendarSyncService;
  }

  // ============================================================================
  // USE CASES
  // ============================================================================

  getCreateEventUseCase() {
    if (!this._instances.createEventUseCase) {
      this._instances.createEventUseCase = new CreateEventUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository(),
        userRepository: this.getUserRepository(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        cloudinaryAdapter: this.getCloudinaryAdapter(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        notificationAdapter: this.getNotificationAdapter(),
        groupRepository: this.getGroupRepository(),
        firebaseAdapter: this.getFirebaseAdapter(),
        walletRepository: this.getWalletRepository(),
        calendarSyncService: this.getCalendarSyncService()
      });
    }
    return this._instances.createEventUseCase;
  }

  getGetEventUseCase() {
    if (!this._instances.getEventUseCase) {
      this._instances.getEventUseCase = new GetEventUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository(),
        eventTeamRepository: this.getEventTeamRepository(),
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.getEventUseCase;
  }

  getUpdateEventUseCase() {
    if (!this._instances.updateEventUseCase) {
      this._instances.updateEventUseCase = new UpdateEventUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository(),
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        cloudinaryAdapter: this.getCloudinaryAdapter()
      });
    }
    return this._instances.updateEventUseCase;
  }

  getDeleteEventUseCase() {
    if (!this._instances.deleteEventUseCase) {
      this._instances.deleteEventUseCase = new DeleteEventUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository(),
        userRepository: this.getUserRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.deleteEventUseCase;
  }

  getListEventsUseCase() {
    if (!this._instances.listEventsUseCase) {
      this._instances.listEventsUseCase = new ListEventsUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository(),
        eventParticipantRepository: this.getEventParticipantRepository()
      });
    }
    return this._instances.listEventsUseCase;
  }

  getAddParticipantsUseCase() {
    if (!this._instances.addParticipantsUseCase) {
      this._instances.addParticipantsUseCase = new AddParticipantsUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        calendarSyncService: this.getCalendarSyncService(),
        groupRepository: this.getGroupRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.addParticipantsUseCase;
  }

  getUpdateParticipantStatusUseCase() {
    if (!this._instances.updateParticipantStatusUseCase) {
      this._instances.updateParticipantStatusUseCase = new UpdateParticipantStatusUseCase({
        eventRepository: this.getEventRepository(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        calendarRepository: this.getCalendarRepository(),
        notificationAdapter: this.getNotificationAdapter(),
        groupRepository: this.getGroupRepository(),
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.updateParticipantStatusUseCase;
  }

  getRemoveParticipantUseCase() {
    if (!this._instances.removeParticipantUseCase) {
      this._instances.removeParticipantUseCase = new RemoveParticipantUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        notificationAdapter: this.getNotificationAdapter(),
        groupRepository: this.getGroupRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.removeParticipantUseCase;
  }

  getPublishEventUseCase() {
    if (!this._instances.publishEventUseCase) {
      this._instances.publishEventUseCase = new PublishEventUseCase({
        eventRepository: this.getEventRepository(),
        walletRepository: this.getWalletRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.publishEventUseCase;
  }

  getUnpublishEventUseCase() {
    if (!this._instances.unpublishEventUseCase) {
      this._instances.unpublishEventUseCase = new UnpublishEventUseCase({
        eventRepository: this.getEventRepository()
      });
    }
    return this._instances.unpublishEventUseCase;
  }

  getCancelEventUseCase() {
    if (!this._instances.cancelEventUseCase) {
      const ticketRepository = new TicketRepository();
      const transactionRepository = new TransactionRepository();
      const walletEmailAdapter = new WalletEmailAdapter();
      const walletNotificationService = new WalletNotificationService({
        emailAdapter: walletEmailAdapter
      });
      const walletLedgerEntryRepository = new WalletLedgerEntryRepository();
      const walletRefundService = new WalletRefundService({
        walletRepository: this.getWalletRepository(),
        walletLedgerEntryRepository
      });

      this._instances.cancelEventUseCase = new CancelEventUseCase({
        eventRepository: this.getEventRepository(),
        ticketRepository,
        transactionRepository,
        walletRefundService,
        userRepository: this.getUserRepository(),
        walletNotificationService,
        walletRepository: this.getWalletRepository()
      });
    }
    return this._instances.cancelEventUseCase;
  }

  getUpdateTicketTypeUseCase() {
    if (!this._instances.updateTicketTypeUseCase) {
      this._instances.updateTicketTypeUseCase = new UpdateTicketTypeUseCase({
        eventRepository: this.getEventRepository()
      });
    }
    return this._instances.updateTicketTypeUseCase;
  }

  getDeleteTicketTypeUseCase() {
    if (!this._instances.deleteTicketTypeUseCase) {
      this._instances.deleteTicketTypeUseCase = new DeleteTicketTypeUseCase({
        eventRepository: this.getEventRepository()
      });
    }
    return this._instances.deleteTicketTypeUseCase;
  }

  getGetTicketTypesUseCase() {
    if (!this._instances.getTicketTypesUseCase) {
      this._instances.getTicketTypesUseCase = new GetTicketTypesUseCase({
        eventRepository: this.getEventRepository()
      });
    }
    return this._instances.getTicketTypesUseCase;
  }

  getAddEventTeamMemberUseCase() {
    if (!this._instances.addEventTeamMemberUseCase) {
      this._instances.addEventTeamMemberUseCase = new AddEventTeamMemberUseCase({
        eventRepository: this.getEventRepository(),
        eventTeamRepository: this.getEventTeamRepository(),
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.addEventTeamMemberUseCase;
  }

  getUpdateEventTeamMemberUseCase() {
    if (!this._instances.updateEventTeamMemberUseCase) {
      this._instances.updateEventTeamMemberUseCase = new UpdateEventTeamMemberUseCase({
        eventRepository: this.getEventRepository(),
        eventTeamRepository: this.getEventTeamRepository()
      });
    }
    return this._instances.updateEventTeamMemberUseCase;
  }

  getRemoveEventTeamMemberUseCase() {
    if (!this._instances.removeEventTeamMemberUseCase) {
      this._instances.removeEventTeamMemberUseCase = new RemoveEventTeamMemberUseCase({
        eventRepository: this.getEventRepository(),
        eventTeamRepository: this.getEventTeamRepository()
      });
    }
    return this._instances.removeEventTeamMemberUseCase;
  }

  getGetEventTeamUseCase() {
    if (!this._instances.getEventTeamUseCase) {
      this._instances.getEventTeamUseCase = new GetEventTeamUseCase({
        eventRepository: this.getEventRepository(),
        eventTeamRepository: this.getEventTeamRepository()
      });
    }
    return this._instances.getEventTeamUseCase;
  }

  getGetTeamEventsUseCase() {
    if (!this._instances.getTeamEventsUseCase) {
      this._instances.getTeamEventsUseCase = new GetTeamEventsUseCase({
        eventRepository: this.getEventRepository(),
        eventTeamRepository: this.getEventTeamRepository()
      });
    }
    return this._instances.getTeamEventsUseCase;
  }

  getListTeamInvitationsUseCase() {
    if (!this._instances.listTeamInvitationsUseCase) {
      this._instances.listTeamInvitationsUseCase = new ListTeamInvitationsUseCase({
        eventTeamRepository: this.getEventTeamRepository()
      });
    }
    return this._instances.listTeamInvitationsUseCase;
  }

  getGetEventAnalyticsUseCase() {
    if (!this._instances.getEventAnalyticsUseCase) {
      const ticketRepository = new TicketRepository();
      const transactionRepository = new TransactionRepository();
      this._instances.getEventAnalyticsUseCase = new GetEventAnalyticsUseCase({
        eventRepository: this.getEventRepository(),
        ticketRepository,
        transactionRepository,
        eventTeamRepository: this.getEventTeamRepository()
      });
    }
    return this._instances.getEventAnalyticsUseCase;
  }

  // ============================================================================
  // CONTROLLER
  // ============================================================================

  getResendEventTicketsUseCase() {
    if (!this._instances.resendEventTicketsUseCase) {
      const ticketModule = require('../ticket/ticket.module');
      this._instances.resendEventTicketsUseCase = ticketModule.getResendEventTicketsUseCase();
    }
    return this._instances.resendEventTicketsUseCase;
  }

  getEventController() {
    if (!this._instances.eventController) {
      this._instances.eventController = new EventController({
        createEventUseCase: this.getCreateEventUseCase(),
        getEventUseCase: this.getGetEventUseCase(),
        updateEventUseCase: this.getUpdateEventUseCase(),
        deleteEventUseCase: this.getDeleteEventUseCase(),
        listEventsUseCase: this.getListEventsUseCase(),
        addParticipantsUseCase: this.getAddParticipantsUseCase(),
        updateParticipantStatusUseCase: this.getUpdateParticipantStatusUseCase(),
        removeParticipantUseCase: this.getRemoveParticipantUseCase(),
        publishEventUseCase: this.getPublishEventUseCase(),
        unpublishEventUseCase: this.getUnpublishEventUseCase(),
        cancelEventUseCase: this.getCancelEventUseCase(),
        updateTicketTypeUseCase: this.getUpdateTicketTypeUseCase(),
        deleteTicketTypeUseCase: this.getDeleteTicketTypeUseCase(),
        getTicketTypesUseCase: this.getGetTicketTypesUseCase(),
        addEventTeamMemberUseCase: this.getAddEventTeamMemberUseCase(),
        updateEventTeamMemberUseCase: this.getUpdateEventTeamMemberUseCase(),
        removeEventTeamMemberUseCase: this.getRemoveEventTeamMemberUseCase(),
        getEventTeamUseCase: this.getGetEventTeamUseCase(),
        getEventAnalyticsUseCase: this.getGetEventAnalyticsUseCase(),
        getTeamEventsUseCase: this.getGetTeamEventsUseCase(),
        listTeamInvitationsUseCase: this.getListTeamInvitationsUseCase(),
        resendEventTicketsUseCase: this.getResendEventTicketsUseCase()
      });
    }
    return this._instances.eventController;
  }

  // ============================================================================
  // ROUTES
  // ============================================================================

  getEventRoutes() {
    if (!this._instances.eventRoutes) {
      try {
        const controller = this.getEventController();
        if (!controller) {
          throw new Error('EventController is not available');
        }
        this._instances.eventRoutes = createEventRoutes(controller);
        if (!this._instances.eventRoutes) {
          throw new Error('Failed to create event routes');
        }
      } catch (error) {
        console.error('Error creating event routes:', error);
        throw error;
      }
    }
    return this._instances.eventRoutes;
  }
}

module.exports = new EventModule();

