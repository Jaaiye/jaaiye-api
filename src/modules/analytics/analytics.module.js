/**
 * Analytics Domain Container
 * Dependency Injection container
 */

const AnalyticsService = require('./services/analytics.service');
const {
  GetRevenueAnalyticsUseCase,
  GetTicketAnalyticsUseCase,
  GetEventAnalyticsUseCase,
  GetUserAnalyticsUseCase,
  GetEngagementAnalyticsUseCase
} = require('./use-cases');
const AnalyticsController = require('./analytics.controller');
const AnalyticsRoutes = require('./analytics.routes');

// Import repositories from other domains
const { TransactionRepository } = require('../payment/repositories');
const { TicketRepository } = require('../ticket/repositories');
const { EventRepository } = require('../event/repositories');
const { UserRepository } = require('../common/repositories');
const { NotificationRepository } = require('../notification/repositories');
const { GroupRepository } = require('../group/repositories');

class AnalyticsModule {
  constructor() {
    this._analyticsService = null;
    this._getRevenueAnalyticsUseCase = null;
    this._getTicketAnalyticsUseCase = null;
    this._getEventAnalyticsUseCase = null;
    this._getUserAnalyticsUseCase = null;
    this._getEngagementAnalyticsUseCase = null;
    this._analyticsController = null;
    this._analyticsRoutes = null;
  }

  getAnalyticsService() {
    if (!this._analyticsService) {
      this._analyticsService = new AnalyticsService({
        transactionRepository: new TransactionRepository(),
        ticketRepository: new TicketRepository(),
        eventRepository: new EventRepository(),
        userRepository: new UserRepository(),
        notificationRepository: new NotificationRepository(),
        groupRepository: new GroupRepository()
      });
    }
    return this._analyticsService;
  }

  getGetRevenueAnalyticsUseCase() {
    if (!this._getRevenueAnalyticsUseCase) {
      this._getRevenueAnalyticsUseCase = new GetRevenueAnalyticsUseCase({
        analyticsService: this.getAnalyticsService()
      });
    }
    return this._getRevenueAnalyticsUseCase;
  }

  getGetTicketAnalyticsUseCase() {
    if (!this._getTicketAnalyticsUseCase) {
      this._getTicketAnalyticsUseCase = new GetTicketAnalyticsUseCase({
        analyticsService: this.getAnalyticsService()
      });
    }
    return this._getTicketAnalyticsUseCase;
  }

  getGetEventAnalyticsUseCase() {
    if (!this._getEventAnalyticsUseCase) {
      this._getEventAnalyticsUseCase = new GetEventAnalyticsUseCase({
        analyticsService: this.getAnalyticsService()
      });
    }
    return this._getEventAnalyticsUseCase;
  }

  getGetUserAnalyticsUseCase() {
    if (!this._getUserAnalyticsUseCase) {
      this._getUserAnalyticsUseCase = new GetUserAnalyticsUseCase({
        analyticsService: this.getAnalyticsService()
      });
    }
    return this._getUserAnalyticsUseCase;
  }

  getGetEngagementAnalyticsUseCase() {
    if (!this._getEngagementAnalyticsUseCase) {
      this._getEngagementAnalyticsUseCase = new GetEngagementAnalyticsUseCase({
        analyticsService: this.getAnalyticsService()
      });
    }
    return this._getEngagementAnalyticsUseCase;
  }

  getAnalyticsController() {
    if (!this._analyticsController) {
      this._analyticsController = new AnalyticsController({
        getRevenueAnalyticsUseCase: this.getGetRevenueAnalyticsUseCase(),
        getTicketAnalyticsUseCase: this.getGetTicketAnalyticsUseCase(),
        getEventAnalyticsUseCase: this.getGetEventAnalyticsUseCase(),
        getUserAnalyticsUseCase: this.getGetUserAnalyticsUseCase(),
        getEngagementAnalyticsUseCase: this.getGetEngagementAnalyticsUseCase()
      });
    }
    return this._analyticsController;
  }

  getAnalyticsRoutes() {
    if (!this._analyticsRoutes) {
      this._analyticsRoutes = new AnalyticsRoutes({
        analyticsController: this.getAnalyticsController()
      });
    }
    return this._analyticsRoutes.getRoutes();
  }
}

module.exports = new AnalyticsModule();

