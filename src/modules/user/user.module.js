/**
 * User Module
 * Dependency Injection container for User domain
 */

// Common/Shared
const { UserRepository, BankAccountRepository } = require('../common/repositories');
const { NotificationAdapter: SharedNotificationAdapter, FirebaseAdapter } = require('../common/services');
const EmailAdapter = require('../email/adapters/email.adapter');

// Notification Domain
const { NotificationRepository } = require('../notification/repositories');
const { PushNotificationAdapter, FirebaseAdapter: NotificationFirebaseAdapter, DeviceTokenAdapter } = require('../notification/services');
const { SendNotificationUseCase } = require('../notification/use-cases');

// Payment Domain (for FlutterwaveAdapter)
const { FlutterwaveAdapter } = require('../payment/services');

// Wallet Domain (for GetWithdrawalsUseCase)
const { GetWithdrawalsUseCase } = require('../wallet/use-cases');

// Application
const {
  GetProfileUseCase,
  UpdateProfileUseCase,
  ChangePasswordUseCase,
  UpdateEmailUseCase,
  GetFirebaseTokenUseCase,
  LogoutUseCase,
  DeleteAccountUseCase,
  AddBankAccountUseCase,
  SetDefaultBankAccountUseCase
} = require('./use-cases');

// Presentation
const UserController = require('./user.controller');
const createUserRoutes = require('./user.routes');

class UserModule {
  constructor() {
    this._instances = {};
  }

  // Repositories
  getUserRepository() {
    if (!this._instances.userRepository) {
      this._instances.userRepository = new UserRepository();
    }
    return this._instances.userRepository;
  }

  getBankAccountRepository() {
    if (!this._instances.bankAccountRepository) {
      this._instances.bankAccountRepository = new BankAccountRepository();
    }
    return this._instances.bankAccountRepository;
  }

  // Adapters/Services
  getNotificationAdapter() {
    if (!this._instances.notificationAdapter) {
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
      this._instances.notificationAdapter = SharedNotificationAdapter ? new SharedNotificationAdapter({
        sendNotificationUseCase
      }) : null;
    }
    return this._instances.notificationAdapter;
  }

  getEmailAdapter() {
    if (!this._instances.emailAdapter) {
      this._instances.emailAdapter = new EmailAdapter();
    }
    return this._instances.emailAdapter;
  }

  getFirebaseAdapter() {
    if (!this._instances.firebaseAdapter) {
      this._instances.firebaseAdapter = new FirebaseAdapter();
    }
    return this._instances.firebaseAdapter;
  }

  // Use Cases
  getGetProfileUseCase() {
    if (!this._instances.getProfileUseCase) {
      this._instances.getProfileUseCase = new GetProfileUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.getProfileUseCase;
  }

  getUpdateProfileUseCase() {
    if (!this._instances.updateProfileUseCase) {
      this._instances.updateProfileUseCase = new UpdateProfileUseCase({
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.updateProfileUseCase;
  }

  getChangePasswordUseCase() {
    if (!this._instances.changePasswordUseCase) {
      this._instances.changePasswordUseCase = new ChangePasswordUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.changePasswordUseCase;
  }

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

  getGetFirebaseTokenUseCase() {
    if (!this._instances.getFirebaseTokenUseCase) {
      this._instances.getFirebaseTokenUseCase = new GetFirebaseTokenUseCase({
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.getFirebaseTokenUseCase;
  }

  getLogoutUseCase() {
    if (!this._instances.logoutUseCase) {
      this._instances.logoutUseCase = new LogoutUseCase({
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.logoutUseCase;
  }

  getDeleteAccountUseCase() {
    if (!this._instances.deleteAccountUseCase) {
      this._instances.deleteAccountUseCase = new DeleteAccountUseCase({
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.deleteAccountUseCase;
  }

  getAddBankAccountUseCase() {
    if (!this._instances.addBankAccountUseCase) {
      this._instances.addBankAccountUseCase = new AddBankAccountUseCase({
        bankAccountRepository: this.getBankAccountRepository(),
        flutterwaveAdapter: new FlutterwaveAdapter()
      });
    }
    return this._instances.addBankAccountUseCase;
  }

  getSetDefaultBankAccountUseCase() {
    if (!this._instances.setDefaultBankAccountUseCase) {
      this._instances.setDefaultBankAccountUseCase = new SetDefaultBankAccountUseCase({
        bankAccountRepository: this.getBankAccountRepository()
      });
    }
    return this._instances.setDefaultBankAccountUseCase;
  }

  getGetWithdrawalsUseCase() {
    if (!this._instances.getWithdrawalsUseCase) {
      const { WithdrawalRepository, WalletRepository } = require('../wallet/repositories');
      this._instances.getWithdrawalsUseCase = new GetWithdrawalsUseCase({
        withdrawalRepository: new WithdrawalRepository(),
        walletRepository: new WalletRepository()
      });
    }
    return this._instances.getWithdrawalsUseCase;
  }

  // Controller
  getUserController() {
    if (!this._instances.userController) {
      this._instances.userController = new UserController({
        getProfileUseCase: this.getGetProfileUseCase(),
        updateProfileUseCase: this.getUpdateProfileUseCase(),
        changePasswordUseCase: this.getChangePasswordUseCase(),
        updateEmailUseCase: this.getUpdateEmailUseCase(),
        getFirebaseTokenUseCase: this.getGetFirebaseTokenUseCase(),
        logoutUseCase: this.getLogoutUseCase(),
        deleteAccountUseCase: this.getDeleteAccountUseCase(),
        addBankAccountUseCase: this.getAddBankAccountUseCase(),
        setDefaultBankAccountUseCase: this.getSetDefaultBankAccountUseCase(),
        getWithdrawalsUseCase: this.getGetWithdrawalsUseCase(),
        flutterwaveAdapter: new FlutterwaveAdapter()
      });
    }
    return this._instances.userController;
  }

  // Routes
  getUserRoutes() {
    if (!this._instances.userRoutes) {
      this._instances.userRoutes = createUserRoutes({ userController: this.getUserController() });
    }
    return this._instances.userRoutes;
  }
}

module.exports = new UserModule();

