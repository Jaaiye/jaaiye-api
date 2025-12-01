/**
 * User Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse, formatUserResponse } = require('../../../../utils/response');
const UpdateProfileDTO = require('../../application/dto/UpdateProfileDTO');
const ChangePasswordDTO = require('../../application/dto/ChangePasswordDTO');
const UpdateEmailDTO = require('../../application/dto/UpdateEmailDTO');

class UserController {
  constructor({
    getProfileUseCase,
    updateProfileUseCase,
    changePasswordUseCase,
    updateEmailUseCase,
    deleteAccountUseCase,
    logoutUseCase,
    getFirebaseTokenUseCase
  }) {
    this.getProfileUseCase = getProfileUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
    this.updateEmailUseCase = updateEmailUseCase;
    this.deleteAccountUseCase = deleteAccountUseCase;
    this.logoutUseCase = logoutUseCase;
    this.getFirebaseTokenUseCase = getFirebaseTokenUseCase;
  }

  /**
   * Get Firebase token
   * GET /api/v1/users/firebase-token
   */
  getFirebaseToken = asyncHandler(async (req, res) => {
    const result = await this.getFirebaseTokenUseCase.execute(req.user.id);
    return successResponse(res, result);
  });

  /**
   * Get current user profile
   * GET /api/v1/users/profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const result = await this.getProfileUseCase.execute(req.user.id);
    // Format user response to match legacy format
    const formattedUser = formatUserResponse(result.user);
    formattedUser.isGoogleCalendarLinked = result.user.isGoogleCalendarLinked;
    return successResponse(res, { user: formattedUser });
  });

  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const dto = new UpdateProfileDTO(req.body);
    const result = await this.updateProfileUseCase.execute(req.user.id, dto);
    // Format user response to match legacy format
    const formattedUser = formatUserResponse(result.user);
    return successResponse(res, { user: formattedUser });
  });

  /**
   * Change password
   * PUT /api/v1/users/password
   */
  changePassword = asyncHandler(async (req, res) => {
    const dto = new ChangePasswordDTO(req.body);
    await this.changePasswordUseCase.execute(req.user.id, dto);
    return successResponse(res, null, 200, 'Password updated successfully');
  });

  /**
   * Update email
   * PUT /api/v1/users/email
   */
  updateEmail = asyncHandler(async (req, res) => {
    const dto = new UpdateEmailDTO(req.body);
    await this.updateEmailUseCase.execute(req.user.id, dto);
    return successResponse(res, null, 200, 'Email updated. Please verify your new email address.');
  });

  /**
   * Delete user account (soft delete)
   * DELETE /api/v1/users
   */
  deleteUser = asyncHandler(async (req, res) => {
    await this.deleteAccountUseCase.execute(req.user.id, req.body.password);
    return res.status(204).end();
  });

  /**
   * Logout user
   * POST /api/v1/users/logout
   */
  logout = asyncHandler(async (req, res) => {
    try {
      await this.logoutUseCase.execute(req.user.id);
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

