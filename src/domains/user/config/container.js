/**
 * Dependency Injection Container
 * Configuration layer - manages dependencies
 */

const { UserRepository } = require('../../shared/infrastructure/persistence/repositories');
const { NotificationAdapter: SharedNotificationAdapter, FirebaseAdapter, EmailAdapter } = require('../../shared/infrastructure/adapters');
// Notification Domain
const { NotificationRepository } = require('../../notification/infrastructure/persistence/repositories');
const { PushNotificationAdapter, FirebaseAdapter: NotificationFirebaseAdapter, DeviceTokenAdapter } = require('../../notification/infrastructure/adapters');
const { SendNotificationUseCase } = require('../../notification/application/use-cases');
const {
  GetProfileUseCase,
  UpdateProfileUseCase,
  ChangePasswordUseCase,
  UpdateEmailUseCase,
  DeleteAccountUseCase,
  LogoutUseCase,
  GetFirebaseTokenUseCase
} = require('../application/use-cases');
const UserController = require('../presentation/controllers/UserController');
const createUserRoutes = require('../presentation/routes/user.routes');

class UserContainer {
  constructor() {
    this._instances = {};
  }

  /**
   * Get User Repository (reuse from Auth domain)
   */
  getUserRepository() {
    if (!this._instances.userRepository) {
      this._instances.userRepository = new UserRepository();
    }
    return this._instances.userRepository;
  }

  /**
   * Get Notification Adapter
   */
  getNotificationAdapter() {
    if (!this._instances.notificationAdapter) {
      // Initialize Notification domain dependencies
      const notificationRepository = new NotificationRepository();
      const firebaseAdapter = new NotificationFirebaseAdapter();
      const deviceTokenAdapter = new DeviceTokenAdapter();
      const pushNotificationAdapter = new PushNotificationAdapter({
        firebaseAdapter,
        deviceTokenAdapter
      });
      const sendNotificationUseCase = new SendNotificationUseCase({
        notificationRepository,
        pushNotificationAdapter
      });

      // Create shared adapter with dependencies
      this._instances.notificationAdapter = new SharedNotificationAdapter({
        sendNotificationUseCase,
        notificationRepository
      });
    }
    return this._instances.notificationAdapter;
  }

  /**
   * Get Firebase Adapter (reuse from Auth domain)
   */
  getFirebaseAdapter() {
    if (!this._instances.firebaseAdapter) {
      this._instances.firebaseAdapter = new FirebaseAdapter();
    }
    return this._instances.firebaseAdapter;
  }

  /**
   * Get Email Adapter (reuse from Auth domain)
   */
  getEmailAdapter() {
    if (!this._instances.emailAdapter) {
      this._instances.emailAdapter = new EmailAdapter();
    }
    return this._instances.emailAdapter;
  }

  /**
   * Get GetProfileUseCase
   */
  getGetProfileUseCase() {
    if (!this._instances.getProfileUseCase) {
      this._instances.getProfileUseCase = new GetProfileUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.getProfileUseCase;
  }

  /**
   * Get UpdateProfileUseCase
   */
  getUpdateProfileUseCase() {
    if (!this._instances.updateProfileUseCase) {
      this._instances.updateProfileUseCase = new UpdateProfileUseCase({
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.updateProfileUseCase;
  }

  /**
   * Get ChangePasswordUseCase
   */
  getChangePasswordUseCase() {
    if (!this._instances.changePasswordUseCase) {
      this._instances.changePasswordUseCase = new ChangePasswordUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.changePasswordUseCase;
  }

  /**
   * Get UpdateEmailUseCase
   */
  getUpdateEmailUseCase() {
    if (!this._instances.updateEmailUseCase) {
      this._instances.updateEmailUseCase = new UpdateEmailUseCase({
        userRepository: this.getUserRepository(),
        emailAdapter: this.getEmailAdapter(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.updateEmailUseCase;
  }

  /**
   * Get DeleteAccountUseCase
   */
  getDeleteAccountUseCase() {
    if (!this._instances.deleteAccountUseCase) {
      this._instances.deleteAccountUseCase = new DeleteAccountUseCase({
        userRepository: this.getUserRepository(),
        emailAdapter: this.getEmailAdapter()
      });
    }
    return this._instances.deleteAccountUseCase;
  }

  /**
   * Get LogoutUseCase
   */
  getLogoutUseCase() {
    if (!this._instances.logoutUseCase) {
      this._instances.logoutUseCase = new LogoutUseCase({
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.logoutUseCase;
  }

  /**
   * Get GetFirebaseTokenUseCase
   */
  getGetFirebaseTokenUseCase() {
    if (!this._instances.getFirebaseTokenUseCase) {
      this._instances.getFirebaseTokenUseCase = new GetFirebaseTokenUseCase({
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.getFirebaseTokenUseCase;
  }

  /**
   * Get UserController
   */
  getUserController() {
    if (!this._instances.userController) {
      this._instances.userController = new UserController({
        getProfileUseCase: this.getGetProfileUseCase(),
        updateProfileUseCase: this.getUpdateProfileUseCase(),
        changePasswordUseCase: this.getChangePasswordUseCase(),
        updateEmailUseCase: this.getUpdateEmailUseCase(),
        deleteAccountUseCase: this.getDeleteAccountUseCase(),
        logoutUseCase: this.getLogoutUseCase(),
        getFirebaseTokenUseCase: this.getGetFirebaseTokenUseCase()
      });
    }
    return this._instances.userController;
  }

  /**
   * Get User Routes
   */
  getUserRoutes() {
    if (!this._instances.userRoutes) {
      this._instances.userRoutes = createUserRoutes({
        userController: this.getUserController()
      });
    }
    return this._instances.userRoutes;
  }
}

// Export singleton instance
module.exports = new UserContainer();

