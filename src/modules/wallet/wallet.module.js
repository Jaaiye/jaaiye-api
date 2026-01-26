/**
 * Wallet Domain Container
 * Dependency Injection container for Wallet domain
 */

const { WalletRepository, WalletLedgerEntryRepository, WithdrawalRepository } = require('./repositories');
const { GetWalletDetailsUseCase, AdjustWalletBalanceUseCase, RequestWithdrawalWithPayoutUseCase, GetWithdrawalsUseCase, GetWithdrawalDetailsUseCase } = require('./use-cases');
const WalletController = require('./wallet.controller');
const createWalletRoutes = require('./wallet.routes');
const WalletNotificationService = require('./services/WalletNotificationService');
const WalletEmailAdapter = require('./services/WalletEmailAdapter');
const WalletWithdrawalService = require('./services/WalletWithdrawalService');
const WalletAuthorizationService = require('./services/WalletAuthorizationService');
const { EventRepository } = require('../event/repositories');
const { GroupRepository } = require('../group/repositories');
const { UserRepository, BankAccountRepository } = require('../common/repositories');
const { FlutterwaveAdapter } = require('../payment/services');

class WalletModule {
  constructor() {
    this._instances = {};
  }

  // ============================================================================
  // REPOSITORIES
  // ============================================================================

  getWalletRepository() {
    if (!this._instances.walletRepository) {
      this._instances.walletRepository = new WalletRepository();
    }
    return this._instances.walletRepository;
  }

  getWalletLedgerEntryRepository() {
    if (!this._instances.walletLedgerEntryRepository) {
      this._instances.walletLedgerEntryRepository = new WalletLedgerEntryRepository();
    }
    return this._instances.walletLedgerEntryRepository;
  }

  // ============================================================================
  // USE CASES
  // ============================================================================

  getGetWalletDetailsUseCase() {
    if (!this._instances.getWalletDetailsUseCase) {
      this._instances.getWalletDetailsUseCase = new GetWalletDetailsUseCase({
        walletRepository: this.getWalletRepository(),
        walletLedgerEntryRepository: this.getWalletLedgerEntryRepository()
      });
    }
    return this._instances.getWalletDetailsUseCase;
  }

  getAdjustWalletBalanceUseCase() {
    if (!this._instances.adjustWalletBalanceUseCase) {
      this._instances.adjustWalletBalanceUseCase = new AdjustWalletBalanceUseCase({
        walletRepository: this.getWalletRepository(),
        walletLedgerEntryRepository: this.getWalletLedgerEntryRepository(),
        eventRepository: new EventRepository(),
        groupRepository: new GroupRepository(),
        userRepository: new UserRepository(),
        walletNotificationService: this.getWalletNotificationService()
      });
    }
    return this._instances.adjustWalletBalanceUseCase;
  }

  getWalletWithdrawalService() {
    if (!this._instances.walletWithdrawalService) {
      this._instances.walletWithdrawalService = new WalletWithdrawalService({
        walletRepository: this.getWalletRepository(),
        walletLedgerEntryRepository: this.getWalletLedgerEntryRepository(),
        eventRepository: new EventRepository(),
        groupRepository: new GroupRepository()
      });
    }
    return this._instances.walletWithdrawalService;
  }

  getRequestWithdrawalWithPayoutUseCase() {
    if (!this._instances.requestWithdrawalWithPayoutUseCase) {
      this._instances.requestWithdrawalWithPayoutUseCase = new RequestWithdrawalWithPayoutUseCase({
        walletWithdrawalService: this.getWalletWithdrawalService(),
        walletRepository: this.getWalletRepository(),
        walletLedgerEntryRepository: this.getWalletLedgerEntryRepository(),
        bankAccountRepository: new BankAccountRepository(),
        withdrawalRepository: new WithdrawalRepository(),
        flutterwaveAdapter: new FlutterwaveAdapter()
      });
    }
    return this._instances.requestWithdrawalWithPayoutUseCase;
  }

  getGetWithdrawalsUseCase() {
    if (!this._instances.getWithdrawalsUseCase) {
      this._instances.getWithdrawalsUseCase = new GetWithdrawalsUseCase({
        withdrawalRepository: new WithdrawalRepository(),
        walletRepository: this.getWalletRepository()
      });
    }
    return this._instances.getWithdrawalsUseCase;
  }

  getGetWithdrawalDetailsUseCase() {
    if (!this._instances.getWithdrawalDetailsUseCase) {
      this._instances.getWithdrawalDetailsUseCase = new GetWithdrawalDetailsUseCase({
        withdrawalRepository: new WithdrawalRepository(),
        walletRepository: this.getWalletRepository(),
        bankAccountRepository: new BankAccountRepository()
      });
    }
    return this._instances.getWithdrawalDetailsUseCase;
  }

  getWalletNotificationService() {
    if (!this._instances.walletNotificationService) {
      const emailAdapter = new WalletEmailAdapter();
      this._instances.walletNotificationService = new WalletNotificationService({ emailAdapter });
    }
    return this._instances.walletNotificationService;
  }

  getWalletAuthorizationService() {
    if (!this._instances.walletAuthorizationService) {
      this._instances.walletAuthorizationService = new WalletAuthorizationService({
        eventRepository: new EventRepository(),
        groupRepository: new GroupRepository()
      });
    }
    return this._instances.walletAuthorizationService;
  }

  // ============================================================================
  // CONTROLLERS
  // ============================================================================

  getWalletController() {
    if (!this._instances.walletController) {
      this._instances.walletController = new WalletController({
        getWalletDetailsUseCase: this.getGetWalletDetailsUseCase(),
        adjustWalletBalanceUseCase: this.getAdjustWalletBalanceUseCase(),
        requestWithdrawalWithPayoutUseCase: this.getRequestWithdrawalWithPayoutUseCase(),
        getWithdrawalsUseCase: this.getGetWithdrawalsUseCase(),
        getWithdrawalDetailsUseCase: this.getGetWithdrawalDetailsUseCase(),
        walletAuthorizationService: this.getWalletAuthorizationService()
      });
    }
    return this._instances.walletController;
  }

  // ============================================================================
  // ROUTES
  // ============================================================================

  getWalletRoutes() {
    if (!this._instances.walletRoutes) {
      this._instances.walletRoutes = createWalletRoutes(this.getWalletController());
    }
    return this._instances.walletRoutes;
  }
}

module.exports = new WalletModule();

