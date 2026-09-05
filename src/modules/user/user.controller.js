/**
 * User Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse, formatUserResponse } = require('../../utils/response');

const UpdateProfileDTO = require('./dto/UpdateProfileDTO');
const ChangePasswordDTO = require('./dto/ChangePasswordDTO');
const UpdateEmailDTO = require('./dto/UpdateEmailDTO');
const { refreshToken } = require('firebase-admin/app');

class UserController {
  constructor({
    getProfileUseCase,
    updateProfileUseCase,
    changePasswordUseCase,
    updateEmailUseCase,
    deleteAccountUseCase,
    logoutUseCase,
    getFirebaseTokenUseCase,
    addBankAccountUseCase,
    setDefaultBankAccountUseCase,
    deleteBankAccountUseCase,
    getWithdrawalsUseCase,
    flutterwaveAdapter,
  }) {
    this.getProfileUseCase = getProfileUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
    this.updateEmailUseCase = updateEmailUseCase;
    this.deleteAccountUseCase = deleteAccountUseCase;
    this.logoutUseCase = logoutUseCase;
    this.getFirebaseTokenUseCase = getFirebaseTokenUseCase;
    this.addBankAccountUseCase = addBankAccountUseCase;
    this.setDefaultBankAccountUseCase = setDefaultBankAccountUseCase;
    this.deleteBankAccountUseCase = deleteBankAccountUseCase;
    this.getWithdrawalsUseCase = getWithdrawalsUseCase;
    this.flutterwaveAdapter = flutterwaveAdapter;
  }

  /**
   * @swagger
   * /users/firebase-token:
   *   get:
   *     summary: Get Firebase token
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: successful operation
   */
  getFirebaseToken = asyncHandler(async (req, res) => {
    const result = await this.getFirebaseTokenUseCase.execute(req.user.id);
    return successResponse(res, result);
  });

  /**
   * @swagger
   * /users/banks:
   *   get:
   *     summary: Get list of banks
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: country
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of banks
   */
  getBanks = asyncHandler(async (req, res) => {
    const country = req.query.country || 'NG'; // Default to Nigeria
    const banks = await this.flutterwaveAdapter.getBanks(country);
    return successResponse(res, { banks });
  });

  /**
   * @swagger
   * /users/bank-accounts:
   *   post:
   *     summary: Add and verify bank account
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               bankCode:
   *                 type: string
   *               bankName:
   *                 type: string
   *               accountNumber:
   *                 type: string
   *     responses:
   *       200:
   *         description: Bank account added
   */
  addBankAccount = asyncHandler(async (req, res) => {
    const { bankCode, bankName, accountNumber } = req.body;
    const bankAccount = await this.addBankAccountUseCase.execute(req.user.id, {
      bankCode,
      bankName,
      accountNumber
    });
    return successResponse(res, { bankAccount });
  });

  /**
   * @swagger
   * /users/bank-accounts/default:
   *   post:
   *     summary: Set default bank account
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [bankAccountId]
   *             properties:
   *               bankAccountId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Default set
   */
  setDefaultBankAccount = asyncHandler(async (req, res) => {
    const { bankAccountId } = req.body;
    const bankAccount = await this.setDefaultBankAccountUseCase.execute(req.user.id, bankAccountId);
    return successResponse(res, { bankAccount });
  });

  /**
   * @swagger
   * /users/bank-accounts/{id}:
   *   delete:
   *     summary: Delete a bank account
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Bank account deleted
   */
  deleteBankAccount = asyncHandler(async (req, res) => {
    const result = await this.deleteBankAccountUseCase.execute(req.user.id, req.params.id);
    return successResponse(res, result);
  });

  /**
   * @swagger
   * /users/withdrawals:
   *   get:
   *     summary: Get user withdrawals
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of withdrawals
   */
  getUserWithdrawals = asyncHandler(async (req, res) => {
    if (!this.getWithdrawalsUseCase) {
      return res.status(501).json({
        status: 'fail',
        message: 'Withdrawals feature not available'
      });
    }

    const userId = req.user.id || req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const result = await this.getWithdrawalsUseCase.executeByUser({
      userId,
      limit,
      skip
    });

    return successResponse(res, result);
  });

  /**
   * @swagger
   * /users/profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   */
  getProfile = asyncHandler(async (req, res) => {
    const result = await this.getProfileUseCase.execute(req.user.id);
    // Format user response to match legacy format
    const formattedUser = formatUserResponse(result.user);
    formattedUser.isGoogleCalendarLinked = result.user.isGoogleCalendarLinked;
    formattedUser.isGoogle = result.user.isGoogle;
    formattedUser.isApple = result.user.isApple;
    formattedUser.isGuestUser = result.user.isGuestUser;
    return successResponse(res, { user: formattedUser });
  });

  /**
   * @swagger
   * /users/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fullName:
   *                 type: string
   *               username:
   *                 type: string
   *     responses:
   *       200:
   *         description: Profile updated
   */
  updateProfile = asyncHandler(async (req, res) => {
    const dto = new UpdateProfileDTO(req.body);
    const result = await this.updateProfileUseCase.execute(req.user.id, dto);
    // Format user response to match legacy format
    const formattedUser = formatUserResponse(result.user);
    formattedUser.isGoogleCalendarLinked = result.user.isGoogleCalendarLinked;
    formattedUser.isGoogle = result.user.isGoogle;
    formattedUser.isApple = result.user.isApple;
    return successResponse(res, { user: formattedUser });
  });

  /**
   * @swagger
   * /users/password:
   *   put:
   *     summary: Change user password
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [currentPassword, newPassword]
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password updated
   */
  changePassword = asyncHandler(async (req, res) => {
    const dto = new ChangePasswordDTO(req.body);
    await this.changePasswordUseCase.execute(req.user.id, dto);
    return successResponse(res, null, 200, 'Password updated successfully');
  });

  /**
   * @swagger
   * /users/email:
   *   put:
   *     summary: Update user email
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Email updated
   */
  updateEmail = asyncHandler(async (req, res) => {
    const dto = new UpdateEmailDTO(req.body);
    await this.updateEmailUseCase.execute(req.user.id, dto);
    return successResponse(res, null, 200, 'Email updated. Please verify your new email address.');
  });

  /**
   * @swagger
   * /users:
   *   delete:
   *     summary: Delete user account
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [password]
   *             properties:
   *               password:
   *                 type: string
   *     responses:
   *       204:
   *         description: Account deleted
   */
  deleteUser = asyncHandler(async (req, res) => {
    await this.deleteAccountUseCase.execute(req.user.id, req.body.password);
    return res.status(204).end();
  });

  /**
   * @swagger
   * /users/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logged out
   */
  logout = asyncHandler(async (req, res) => {
    try {
      const accessToken = req.headers.authorization.split(' ')[1];
      const refreshToken = req.body.refreshToken;
      await this.logoutUseCase.execute(accessToken, refreshToken);
      return successResponse(res, null, 200, 'Logged out successfully');
    } catch (error) {
      // If user already logged out, return success (legacy behavior)
      if (error.message && error.message.includes('already logged out')) {
        return successResponse(res, null, 200, 'User has already logged out');
      }
      throw error;
    }
  });
}

module.exports = UserController;

