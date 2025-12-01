/**
 * Event Domain Container
 * Dependency Injection container for Event domain
 */

const { UserRepository } = require('../../shared/infrastructure/persistence/repositories');
const { CalendarRepository } = require('../../calendar/infrastructure/persistence/repositories');
const { EventRepository, EventParticipantRepository } = require('../infrastructure/persistence/repositories');
const { GroupRepository } = require('../../group/infrastructure/persistence/repositories');
const { FirebaseAdapter } = require('../../group/infrastructure/adapters');
const { GoogleCalendarAdapter, CloudinaryAdapter } = require('../infrastructure/adapters');
const NotificationAdapter = require('../infrastructure/adapters/NotificationAdapter');
const { SendNotificationUseCase } = require('../../notification/application/use-cases');
const { NotificationRepository } = require('../../notification/infrastructure/persistence/repositories');
const { PushNotificationAdapter } = require('../../notification/infrastructure/adapters');
const {
  CreateEventUseCase,
  GetEventUseCase,
  UpdateEventUseCase,
  DeleteEventUseCase,
  ListEventsUseCase,
  AddParticipantsUseCase,
  UpdateParticipantStatusUseCase,
  RemoveParticipantUseCase
} = require('../application/use-cases');
const EventController = require('../presentation/controllers/EventController');
const createEventRoutes = require('../presentation/routes/event.routes');

class EventContainer {
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

  getGroupRepository() {
    if (!this._instances.groupRepository) {
      this._instances.groupRepository = new GroupRepository();
    }
    return this._instances.groupRepository;
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
      const { PushNotificationAdapter, FirebaseAdapter, DeviceTokenAdapter } = require('../../notification/infrastructure/adapters');
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
      this._instances.googleCalendarAdapter = new GoogleCalendarAdapter();
    }
    return this._instances.googleCalendarAdapter;
  }

  getCloudinaryAdapter() {
    if (!this._instances.cloudinaryAdapter) {
      this._instances.cloudinaryAdapter = new CloudinaryAdapter();
    }
    return this._instances.cloudinaryAdapter;
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
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.createEventUseCase;
  }

  getGetEventUseCase() {
    if (!this._instances.getEventUseCase) {
      this._instances.getEventUseCase = new GetEventUseCase({
        eventRepository: this.getEventRepository(),
        calendarRepository: this.getCalendarRepository()
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
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
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
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
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
        notificationAdapter: this.getNotificationAdapter()
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
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.removeParticipantUseCase;
  }

  // ============================================================================
  // CONTROLLER
  // ============================================================================

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
        removeParticipantUseCase: this.getRemoveParticipantUseCase()
      });
    }
    return this._instances.eventController;
  }

  // ============================================================================
  // ROUTES
  // ============================================================================

  getEventRoutes() {
    return createEventRoutes(this.getEventController());
  }
}

module.exports = new EventContainer();

