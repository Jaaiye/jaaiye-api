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
  GetWithdrawalDetailsUseCase,
  ListGroupsUseCase
} = require('./use-cases');


class AdminController {
  constructor({
    getAdminHealthUseCase,
    listUsersUseCase,
    createAdminUserUseCase,
    updateUserRoleUseCase,
    listWithdrawalsUseCase,
    getWithdrawalDetailsUseCase,
    listGroupsUseCase
  }) {
    /**
     * @swagger
     * /admin/groups:
     *   get:
     *     summary: List groups
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of groups
     */
    this.listGroups = asyncHandler(async (req, res) => {
      const { limit, page, isActive } = req.query;
      const result = await listGroupsUseCase.execute({
        limit,
        page,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      });
      return successResponse(res, result);
    });


    /**
     * @swagger
     * /admin/health:
     *   get:
     *     summary: Admin health check
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Admin health info
     */
    this.health = asyncHandler(async (req, res) => {
      const result = await getAdminHealthUseCase.execute();
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /admin/users:
     *   get:
     *     summary: List all users
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of users
     */
    this.listUsers = asyncHandler(async (req, res) => {
      const { limit, page, role } = req.query;
      const result = await listUsersUseCase.execute({ limit, page, role });
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /admin/users:
     *   post:
     *     summary: Create admin user
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       201:
     *         description: User created
     */
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

    /**
     * @swagger
     * /admin/users/{id}/role:
     *   patch:
     *     summary: Update user role
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [role]
     *             properties:
     *               role:
     *                 type: string
     *                 enum: [user, admin, superadmin]
     *     responses:
     *       200:
     *         description: Role updated
     */
    this.updateUserRole = asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      const result = await updateUserRoleUseCase.execute(id, role);
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /admin/withdrawals:
     *   get:
     *     summary: List all withdrawals
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of withdrawals
     */
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


