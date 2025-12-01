/**
 * Admin Controller
 * Presentation layer - HTTP request handler
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');
const {
  GetAdminHealthUseCase,
  ListUsersUseCase,
  CreateAdminUserUseCase,
  UpdateUserRoleUseCase
} = require('../../application/use-cases');

class AdminController {
  constructor({
    getAdminHealthUseCase,
    listUsersUseCase,
    createAdminUserUseCase,
    updateUserRoleUseCase
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
  }
}

module.exports = AdminController;


