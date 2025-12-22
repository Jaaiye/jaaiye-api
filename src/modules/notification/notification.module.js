/**
 * Notification Domain Container
 * Dependency Injection container for Notification domain
 */

const { NotificationRepository } = require('./repositories');
const { PushNotificationAdapter, DeviceTokenAdapter, FirebaseAdapter } = require('./services');
const {
  RegisterDeviceTokenUseCase,
  RemoveDeviceTokenUseCase,
  GetNotificationsUseCase,
  MarkAsReadUseCase,
  DeleteNotificationsUseCase
} = require('./use-cases');
const NotificationController = require('./notification.controller');
const createNotificationRoutes = require('./notification.routes');

class NotificationModule {
  constructor() {
    this._instances = {};
  }

  // ============================================================================
  // REPOSITORIES
  // ============================================================================

  getNotificationRepository() {
    if (!this._instances.notificationRepository) {
      this._instances.notificationRepository = new NotificationRepository();
    }
    return this._instances.notificationRepository;
  }

  // ============================================================================
  // ADAPTERS
  // ============================================================================

  getFirebaseAdapter() {
    if (!this._instances.firebaseAdapter) {
      this._instances.firebaseAdapter = new FirebaseAdapter();
    }
    return this._instances.firebaseAdapter;
  }

  getDeviceTokenAdapter() {
    if (!this._instances.deviceTokenAdapter) {
      this._instances.deviceTokenAdapter = new DeviceTokenAdapter();
    }
    return this._instances.deviceTokenAdapter;
  }

  getPushNotificationAdapter() {
    if (!this._instances.pushNotificationAdapter) {
      this._instances.pushNotificationAdapter = new PushNotificationAdapter({
        firebaseAdapter: this.getFirebaseAdapter(),
        deviceTokenAdapter: this.getDeviceTokenAdapter()
      });
    }
    return this._instances.pushNotificationAdapter;
  }

  // ============================================================================
  // USE CASES
  // ============================================================================

  getRegisterDeviceTokenUseCase() {
    if (!this._instances.registerDeviceTokenUseCase) {
      this._instances.registerDeviceTokenUseCase = new RegisterDeviceTokenUseCase({
        deviceTokenAdapter: this.getDeviceTokenAdapter()
      });
    }
    return this._instances.registerDeviceTokenUseCase;
  }

  getRemoveDeviceTokenUseCase() {
    if (!this._instances.removeDeviceTokenUseCase) {
      this._instances.removeDeviceTokenUseCase = new RemoveDeviceTokenUseCase({
        deviceTokenAdapter: this.getDeviceTokenAdapter()
      });
    }
    return this._instances.removeDeviceTokenUseCase;
  }

  getGetNotificationsUseCase() {
    if (!this._instances.getNotificationsUseCase) {
      this._instances.getNotificationsUseCase = new GetNotificationsUseCase({
        notificationRepository: this.getNotificationRepository()
      });
    }
    return this._instances.getNotificationsUseCase;
  }

  getMarkAsReadUseCase() {
    if (!this._instances.markAsReadUseCase) {
      this._instances.markAsReadUseCase = new MarkAsReadUseCase({
        notificationRepository: this.getNotificationRepository()
      });
    }
    return this._instances.markAsReadUseCase;
  }

  getDeleteNotificationsUseCase() {
    if (!this._instances.deleteNotificationsUseCase) {
      this._instances.deleteNotificationsUseCase = new DeleteNotificationsUseCase({
        notificationRepository: this.getNotificationRepository()
      });
    }
    return this._instances.deleteNotificationsUseCase;
  }

  // ============================================================================
  // CONTROLLER
  // ============================================================================

  getNotificationController() {
    if (!this._instances.notificationController) {
      this._instances.notificationController = new NotificationController({
        registerDeviceTokenUseCase: this.getRegisterDeviceTokenUseCase(),
        removeDeviceTokenUseCase: this.getRemoveDeviceTokenUseCase(),
        getNotificationsUseCase: this.getGetNotificationsUseCase(),
        markAsReadUseCase: this.getMarkAsReadUseCase(),
        deleteNotificationsUseCase: this.getDeleteNotificationsUseCase()
      });
    }
    return this._instances.notificationController;
  }

  // ============================================================================
  // ROUTES
  // ============================================================================

  getNotificationRoutes() {
    return createNotificationRoutes(this.getNotificationController());
  }
}

module.exports = new NotificationModule();

