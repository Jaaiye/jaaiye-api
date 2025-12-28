/**
 * Auth Module
 * Dependency Injection container for Auth domain
 */

// Common/Shared
const { UserRepository } = require('../common/repositories');
const { EmailAdapter, FirebaseAdapter } = require('../common/services');

// Calendar Domain (for calendar creation and Google Calendar linking)
const { CalendarRepository } = require('../calendar/repositories');
const { GoogleCalendarAdapter } = require('../calendar/services');
const { CalendarSyncAdapter } = require('../calendar/services');

// Infrastructure (Auth-specific)
const TokenBlacklistRepository = require('./repositories/token-blacklist.repository');
const CalendarAdapter = require('./services/calendar.adapter');

// Queue Module (for email notifications)
const NotificationQueue = require('../queue/notification.queue');

// Application
const {
  RegisterUseCase,
  LoginUseCase,
  GoogleOAuthUseCase,
  AppleOAuthUseCase,
  VerifyEmailUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  ResendUseCase,
  CreateUserUseCase
} = require('./use-cases');

// Presentation
const AuthController = require('./auth.controller');
const { createAuthMiddleware } = require('./middleware');
const createAuthRoutes = require('./auth.routes');

class AuthModule {
  constructor() {
    this._instances = {};
  }

  /**
   * Get or create repository instances
   */
  getUserRepository() {
    if (!this._instances.userRepository) {
      this._instances.userRepository = new UserRepository();
    }
    return this._instances.userRepository;
  }

  getTokenBlacklistRepository() {
    if (!this._instances.tokenBlacklistRepository) {
      this._instances.tokenBlacklistRepository = new TokenBlacklistRepository();
    }
    return this._instances.tokenBlacklistRepository;
  }

  /**
   * Get or create adapter instances
   */
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

  getCalendarAdapter() {
    if (!this._instances.calendarAdapter) {
      this._instances.calendarAdapter = new CalendarAdapter({
        calendarRepository: this.getCalendarRepository(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter()
      });
    }
    return this._instances.calendarAdapter;
  }

  getCalendarRepository() {
    if (!this._instances.calendarRepository) {
      this._instances.calendarRepository = new CalendarRepository();
    }
    return this._instances.calendarRepository;
  }

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
      const { EventRepository } = require('../event/repositories');
      const { TicketRepository } = require('../ticket/repositories');
      this._instances.calendarSyncAdapter = new CalendarSyncAdapter({
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        userRepository: this.getUserRepository(),
        eventRepository: new EventRepository(),
        ticketRepository: new TicketRepository()
      });
    }
    return this._instances.calendarSyncAdapter;
  }

  getNotificationQueue() {
    if (!this._instances.notificationQueue) {
      this._instances.notificationQueue = NotificationQueue;
    }
    return this._instances.notificationQueue;
  }

  /**
   * Get or create use case instances
   */
  getRegisterUseCase() {
    if (!this._instances.registerUseCase) {
      this._instances.registerUseCase = new RegisterUseCase({
        userRepository: this.getUserRepository(),
        emailService: this.getEmailAdapter(),
        notificationQueue: this.getNotificationQueue(),
        calendarAdapter: this.getCalendarAdapter()
      });
    }
    return this._instances.registerUseCase;
  }

  getLoginUseCase() {
    if (!this._instances.loginUseCase) {
      this._instances.loginUseCase = new LoginUseCase({
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.loginUseCase;
  }

  getGoogleOAuthUseCase() {
    if (!this._instances.googleOAuthUseCase) {
      this._instances.googleOAuthUseCase = new GoogleOAuthUseCase({
        userRepository: this.getUserRepository(),
        calendarAdapter: this.getCalendarAdapter(),
        googleCalendarAdapter: this.getGoogleCalendarAdapter(),
        calendarSyncAdapter: this.getCalendarSyncAdapter(),
        emailAdapter: this.getEmailAdapter(),
        firebaseAdapter: this.getFirebaseAdapter(),
        emailService: this.getEmailAdapter(),
        notificationQueue: this.getNotificationQueue()
      });
    }
    return this._instances.googleOAuthUseCase;
  }

  getAppleOAuthUseCase() {
    if (!this._instances.appleOAuthUseCase) {
      this._instances.appleOAuthUseCase = new AppleOAuthUseCase({
        userRepository: this.getUserRepository(),
        calendarAdapter: this.getCalendarAdapter(),
        emailAdapter: this.getEmailAdapter(),
        firebaseAdapter: this.getFirebaseAdapter(),
        emailService: this.getEmailAdapter(),
        notificationQueue: this.getNotificationQueue()
      });
    }
    return this._instances.appleOAuthUseCase;
  }

  getVerifyEmailUseCase() {
    if (!this._instances.verifyEmailUseCase) {
      this._instances.verifyEmailUseCase = new VerifyEmailUseCase({
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter(),
        emailService: this.getEmailAdapter(),
        notificationQueue: this.getNotificationQueue()
      });
    }
    return this._instances.verifyEmailUseCase;
  }

  getForgotPasswordUseCase() {
    if (!this._instances.forgotPasswordUseCase) {
      this._instances.forgotPasswordUseCase = new ForgotPasswordUseCase({
        userRepository: this.getUserRepository(),
        emailService: this.getEmailAdapter(),
        notificationQueue: this.getNotificationQueue()
      });
    }
    return this._instances.forgotPasswordUseCase;
  }

  getResetPasswordUseCase() {
    if (!this._instances.resetPasswordUseCase) {
      this._instances.resetPasswordUseCase = new ResetPasswordUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.resetPasswordUseCase;
  }

  getLogoutUseCase() {
    if (!this._instances.logoutUseCase) {
      this._instances.logoutUseCase = new LogoutUseCase({
        userRepository: this.getUserRepository(),
        tokenBlacklistRepository: this.getTokenBlacklistRepository()
      });
    }
    return this._instances.logoutUseCase;
  }

  getRefreshTokenUseCase() {
    if (!this._instances.refreshTokenUseCase) {
      this._instances.refreshTokenUseCase = new RefreshTokenUseCase({
        userRepository: this.getUserRepository(),
        tokenBlacklistRepository: this.getTokenBlacklistRepository()
      });
    }
    return this._instances.refreshTokenUseCase;
  }

  getResendUseCase() {
    if (!this._instances.resendUseCase) {
      this._instances.resendUseCase = new ResendUseCase({
        userRepository: this.getUserRepository(),
        emailService: this.getEmailAdapter(),
        notificationQueue: this.getNotificationQueue()
      });
    }
    return this._instances.resendUseCase;
  }

  getCreateUserUseCase() {
    if (!this._instances.createUserUseCase) {
      this._instances.createUserUseCase = new CreateUserUseCase({
        userRepository: this.getUserRepository(),
        calendarAdapter: this.getCalendarAdapter()
      });
    }
    return this._instances.createUserUseCase;
  }

  /**
   * Get or create controller instance
   */
  getAuthController() {
    if (!this._instances.authController) {
      this._instances.authController = new AuthController({
        registerUseCase: this.getRegisterUseCase(),
        loginUseCase: this.getLoginUseCase(),
        googleOAuthUseCase: this.getGoogleOAuthUseCase(),
        appleOAuthUseCase: this.getAppleOAuthUseCase(),
        verifyEmailUseCase: this.getVerifyEmailUseCase(),
        forgotPasswordUseCase: this.getForgotPasswordUseCase(),
        resetPasswordUseCase: this.getResetPasswordUseCase(),
        logoutUseCase: this.getLogoutUseCase(),
        refreshTokenUseCase: this.getRefreshTokenUseCase(),
        resendUseCase: this.getResendUseCase(),
        createUserUseCase: this.getCreateUserUseCase()
      });
    }
    return this._instances.authController;
  }

  /**
   * Get or create middleware instance
   */
  getAuthMiddleware() {
    if (!this._instances.authMiddleware) {
      this._instances.authMiddleware = createAuthMiddleware({
        userRepository: this.getUserRepository(),
        tokenBlacklistRepository: this.getTokenBlacklistRepository()
      });
    }
    return this._instances.authMiddleware;
  }

  /**
   * Get or create optional auth middleware
   */
  getOptionalAuthMiddleware() {
    if (!this._instances.optionalAuthMiddleware) {
      const { createOptionalAuthMiddleware } = require('./middleware');
      this._instances.optionalAuthMiddleware = createOptionalAuthMiddleware({
        userRepository: this.getUserRepository(),
        tokenBlacklistRepository: this.getTokenBlacklistRepository()
      });
    }
    return this._instances.optionalAuthMiddleware;
  }

  /**
   * Get auth routes
   */
  getAuthRoutes() {
    return createAuthRoutes({
      authController: this.getAuthController(),
      authMiddleware: this.getAuthMiddleware()
    });
  }

  /**
   * Get protect middleware (alias for getAuthMiddleware)
   */
  get protect() {
    return this.getAuthMiddleware();
  }

  /**
   * Get optionalAuth middleware (alias for getOptionalAuthMiddleware)
   */
  get optionalAuth() {
    return this.getOptionalAuthMiddleware();
  }
}

module.exports = new AuthModule();

