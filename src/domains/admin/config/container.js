/**
 * Admin Domain Container
 * Dependency Injection container
 */

const { UserRepository } = require('../../shared/infrastructure/persistence/repositories');
const {
  GetAdminHealthUseCase,
  ListUsersUseCase,
  CreateAdminUserUseCase,
  UpdateUserRoleUseCase
} = require('../application/use-cases');
const AdminController = require('../presentation/controllers/AdminController');
const AdminRoutes = require('../presentation/routes/admin.routes');

class AdminContainer {
  constructor() {
    this._userRepository = null;
    this._getAdminHealthUseCase = null;
    this._listUsersUseCase = null;
    this._createAdminUserUseCase = null;
    this._updateUserRoleUseCase = null;
    this._adminController = null;
    this._adminRoutes = null;
  }

  getUserRepository() {
    if (!this._userRepository) {
      this._userRepository = new UserRepository();
    }
    return this._userRepository;
  }

  getGetAdminHealthUseCase() {
    if (!this._getAdminHealthUseCase) {
      this._getAdminHealthUseCase = new GetAdminHealthUseCase();
    }
    return this._getAdminHealthUseCase;
  }

  getListUsersUseCase() {
    if (!this._listUsersUseCase) {
      this._listUsersUseCase = new ListUsersUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._listUsersUseCase;
  }

  getCreateAdminUserUseCase() {
    if (!this._createAdminUserUseCase) {
      this._createAdminUserUseCase = new CreateAdminUserUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._createAdminUserUseCase;
  }

  getUpdateUserRoleUseCase() {
    if (!this._updateUserRoleUseCase) {
      this._updateUserRoleUseCase = new UpdateUserRoleUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._updateUserRoleUseCase;
  }

  getAdminController() {
    if (!this._adminController) {
      this._adminController = new AdminController({
        getAdminHealthUseCase: this.getGetAdminHealthUseCase(),
        listUsersUseCase: this.getListUsersUseCase(),
        createAdminUserUseCase: this.getCreateAdminUserUseCase(),
        updateUserRoleUseCase: this.getUpdateUserRoleUseCase()
      });
    }
    return this._adminController;
  }

  getAdminRoutes() {
    if (!this._adminRoutes) {
      this._adminRoutes = new AdminRoutes({
        adminController: this.getAdminController()
      });
    }
    return this._adminRoutes.getRoutes();
  }
}

module.exports = new AdminContainer();


