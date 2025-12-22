/**
 * Admin Controller
 * Presentation layer - HTTP request handler
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const {
  GetAdminHealthUseCase,
  ListUsersUseCase,
  CreateAdminUserUseCase,
  UpdateUserRoleUseCase,
  ListWithdrawalsUseCase,
  GetWithdrawalDetailsUseCase
} = require('./use-cases');

class AdminController {
  constructor({
    getAdminHealthUseCase,
    listUsersUseCase,
    createAdminUserUseCase,
    updateUserRoleUseCase,
    listWithdrawalsUseCase,
    getWithdrawalDetailsUseCase
  }) {
    this.health = asyncHandler(async (req, res) => {
      const result = await getAdminHealthUseCase.execute();
      return successResponse(res, result);
    });

    this.listUsers = asyncHandler(async (req, res) => {
      const { limit, page, role } = req.query;
      const result = await listUsersUseCase.execute({ limit, page, role });
      return successResponse(res, result);
    });

    this.createUser = asyncHandler(async (req, res) => {
      const { email, fullName, username, password, role, isActive } = req.body;
      const result = await createAdminUserUseCase.execute({
        email,
        fullName,
        username,
        password,
        role,
        isActive
      });
      return successResponse(res, result);
    });

    this.updateUserRole = asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      const result = await updateUserRoleUseCase.execute(id, role);
      return successResponse(res, result);
    });

    this.listWithdrawals = asyncHandler(async (req, res) => {
      const { status, ownerType, userId, limit, skip, sort, sortOrder } = req.query;
      const result = await listWithdrawalsUseCase.execute({
        status,
        ownerType,
        userId,
        limit: limit ? parseInt(limit) : 50,
        skip: skip ? parseInt(skip) : 0,
        sort: sort || 'createdAt',
        sortOrder: sortOrder ? parseInt(sortOrder) : -1
      });
      return successResponse(res, result);
    });

    this.getWithdrawalDetails = asyncHandler(async (req, res) => {
      const { withdrawalId } = req.params;
      const result = await getWithdrawalDetailsUseCase.execute({ withdrawalId });
      return successResponse(res, { withdrawal: result });
    });
  }
}

module.exports = AdminController;


