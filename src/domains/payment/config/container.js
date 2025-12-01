/**
 * Payment Domain Container
 * Dependency Injection container
 */

const { TransactionRepository } = require('../infrastructure/persistence/repositories');
const { PaystackAdapter, FlutterwaveAdapter, PayazaAdapter, MonnifyAdapter, PaymentService } = require('../infrastructure/adapters');
const {
  InitializePaystackPaymentUseCase,
  InitializeFlutterwavePaymentUseCase,
  VerifyPaystackPaymentUseCase,
  VerifyFlutterwavePaymentUseCase,
  RegisterTransactionUseCase,
  UpdateTransactionUseCase,
  ProcessPaystackWebhookUseCase,
  ProcessFlutterwaveWebhookUseCase
} = require('../application/use-cases');
const PaymentController = require('../presentation/controllers/PaymentController');
const { PaymentRoutes, TransactionRoutes } = require('../presentation/routes/payment.routes');

// Import shared dependencies
const { UserRepository } = require('../../shared/infrastructure/persistence/repositories');
const { EventRepository } = require('../../event/infrastructure/persistence/repositories');
const { CreateTicketUseCase } = require('../../ticket/application/use-cases');
const { EmailAdapter } = require('../../ticket/infrastructure/adapters');

class PaymentContainer {
  constructor() {
    // Repositories
    this._transactionRepository = null;
    this._userRepository = null;
    this._eventRepository = null;

    // Adapters
    this._paystackAdapter = null;
    this._flutterwaveAdapter = null;
    this._paymentService = null;
    this._emailAdapter = null;

  // Use Cases
  this._initializePaystackPaymentUseCase = null;
  this._initializeFlutterwavePaymentUseCase = null;
  this._verifyPaystackPaymentUseCase = null;
  this._verifyFlutterwavePaymentUseCase = null;
  this._registerTransactionUseCase = null;
  this._updateTransactionUseCase = null;
  this._processPaystackWebhookUseCase = null;
  this._processFlutterwaveWebhookUseCase = null;
  this._getMyTransactionsUseCase = null;
  this._listTransactionsUseCase = null;

    // Controller
    this._paymentController = null;

  // Routes
  this._paymentRoutes = null;
  this._transactionRoutes = null;
  }

  // Repositories
  getTransactionRepository() {
    if (!this._transactionRepository) {
      this._transactionRepository = new TransactionRepository();
    }
    return this._transactionRepository;
  }

  getUserRepository() {
    if (!this._userRepository) {
      this._userRepository = new UserRepository();
    }
    return this._userRepository;
  }

  getEventRepository() {
    if (!this._eventRepository) {
      this._eventRepository = new EventRepository();
    }
    return this._eventRepository;
  }

  // Adapters
  getPaystackAdapter() {
    if (!this._paystackAdapter) {
      this._paystackAdapter = new PaystackAdapter();
    }
    return this._paystackAdapter;
  }

  getFlutterwaveAdapter() {
    if (!this._flutterwaveAdapter) {
      this._flutterwaveAdapter = new FlutterwaveAdapter();
    }
    return this._flutterwaveAdapter;
  }

  getPayazaAdapter() {
    if (!this._payazaAdapter) {
      this._payazaAdapter = new PayazaAdapter({
        paymentService: this.getPaymentService(),
        transactionRepository: this.getTransactionRepository()
      });
    }
    return this._payazaAdapter;
  }

  getMonnifyAdapter() {
    if (!this._monnifyAdapter) {
      this._monnifyAdapter = new MonnifyAdapter({
        paymentService: this.getPaymentService(),
        transactionRepository: this.getTransactionRepository()
      });
    }
    return this._monnifyAdapter;
  }

  getEmailAdapter() {
    if (!this._emailAdapter) {
      this._emailAdapter = new EmailAdapter();
    }
    return this._emailAdapter;
  }

  getPaymentService() {
    if (!this._paymentService) {
      // Get CreateTicketUseCase from Ticket domain
      const ticketContainer = require('../../ticket/config/container');
      const createTicketUseCase = ticketContainer.getCreateTicketUseCase();

      this._paymentService = new PaymentService({
        transactionRepository: this.getTransactionRepository(),
        createTicketUseCase,
        userRepository: this.getUserRepository(),
        eventRepository: this.getEventRepository(),
        emailAdapter: this.getEmailAdapter()
      });
    }
    return this._paymentService;
  }

  // Use Cases
  getInitializePaystackPaymentUseCase() {
    if (!this._initializePaystackPaymentUseCase) {
      this._initializePaystackPaymentUseCase = new InitializePaystackPaymentUseCase({
        paystackAdapter: this.getPaystackAdapter()
      });
    }
    return this._initializePaystackPaymentUseCase;
  }

  getInitializeFlutterwavePaymentUseCase() {
    if (!this._initializeFlutterwavePaymentUseCase) {
      this._initializeFlutterwavePaymentUseCase = new InitializeFlutterwavePaymentUseCase({
        flutterwaveAdapter: this.getFlutterwaveAdapter()
      });
    }
    return this._initializeFlutterwavePaymentUseCase;
  }

  getGetMyTransactionsUseCase() {
    if (!this._getMyTransactionsUseCase) {
      const { GetMyTransactionsUseCase } = require('../application/use-cases');
      this._getMyTransactionsUseCase = new GetMyTransactionsUseCase({
        transactionRepository: this.getTransactionRepository()
      });
    }
    return this._getMyTransactionsUseCase;
  }

  getListTransactionsUseCase() {
    if (!this._listTransactionsUseCase) {
      const { ListTransactionsUseCase } = require('../application/use-cases');
      this._listTransactionsUseCase = new ListTransactionsUseCase({
        transactionRepository: this.getTransactionRepository()
      });
    }
    return this._listTransactionsUseCase;
  }

  getVerifyPaystackPaymentUseCase() {
    if (!this._verifyPaystackPaymentUseCase) {
      this._verifyPaystackPaymentUseCase = new VerifyPaystackPaymentUseCase({
        paystackAdapter: this.getPaystackAdapter()
      });
    }
    return this._verifyPaystackPaymentUseCase;
  }

  getVerifyFlutterwavePaymentUseCase() {
    if (!this._verifyFlutterwavePaymentUseCase) {
      this._verifyFlutterwavePaymentUseCase = new VerifyFlutterwavePaymentUseCase({
        flutterwaveAdapter: this.getFlutterwaveAdapter()
      });
    }
    return this._verifyFlutterwavePaymentUseCase;
  }

  getRegisterTransactionUseCase() {
    if (!this._registerTransactionUseCase) {
      this._registerTransactionUseCase = new RegisterTransactionUseCase({
        transactionRepository: this.getTransactionRepository()
      });
    }
    return this._registerTransactionUseCase;
  }

  getUpdateTransactionUseCase() {
    if (!this._updateTransactionUseCase) {
      this._updateTransactionUseCase = new UpdateTransactionUseCase({
        transactionRepository: this.getTransactionRepository()
      });
    }
    return this._updateTransactionUseCase;
  }

  getProcessPaystackWebhookUseCase() {
    if (!this._processPaystackWebhookUseCase) {
      this._processPaystackWebhookUseCase = new ProcessPaystackWebhookUseCase({
        paystackAdapter: this.getPaystackAdapter(),
        paymentService: this.getPaymentService()
      });
    }
    return this._processPaystackWebhookUseCase;
  }

  getProcessFlutterwaveWebhookUseCase() {
    if (!this._processFlutterwaveWebhookUseCase) {
      this._processFlutterwaveWebhookUseCase = new ProcessFlutterwaveWebhookUseCase({
        flutterwaveAdapter: this.getFlutterwaveAdapter(),
        paymentService: this.getPaymentService()
      });
    }
    return this._processFlutterwaveWebhookUseCase;
  }

  // Controller
  getPaymentController() {
    if (!this._paymentController) {
      this._paymentController = new PaymentController({
        initializePaystackPaymentUseCase: this.getInitializePaystackPaymentUseCase(),
        initializeFlutterwavePaymentUseCase: this.getInitializeFlutterwavePaymentUseCase(),
        verifyPaystackPaymentUseCase: this.getVerifyPaystackPaymentUseCase(),
        verifyFlutterwavePaymentUseCase: this.getVerifyFlutterwavePaymentUseCase(),
        registerTransactionUseCase: this.getRegisterTransactionUseCase(),
        updateTransactionUseCase: this.getUpdateTransactionUseCase(),
        processPaystackWebhookUseCase: this.getProcessPaystackWebhookUseCase(),
        processFlutterwaveWebhookUseCase: this.getProcessFlutterwaveWebhookUseCase(),
        getMyTransactionsUseCase: this.getGetMyTransactionsUseCase(),
        listTransactionsUseCase: this.getListTransactionsUseCase()
      });
    }
    return this._paymentController;
  }

  // Routes
  getPaymentRoutes() {
    if (!this._paymentRoutes) {
      this._paymentRoutes = new PaymentRoutes({
        paymentController: this.getPaymentController()
      });
    }
    return this._paymentRoutes.getRoutes();
  }

  getTransactionRoutes() {
    if (!this._transactionRoutes) {
      this._transactionRoutes = new TransactionRoutes({
        paymentController: this.getPaymentController()
      });
    }
    return this._transactionRoutes.getRoutes();
  }
}

module.exports = new PaymentContainer();

