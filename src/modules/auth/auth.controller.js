/**
 * Auth Controller
 * Presentation layer - HTTP handlers
 * Uses application use cases
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const { RegisterDTO, LoginDTO, GoogleOAuthDTO, AppleOAuthDTO } = require('./dto');

class AuthController {
  constructor({
    registerUseCase,
    loginUseCase,
    googleOAuthUseCase,
    appleOAuthUseCase,
    verifyEmailUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase,
    logoutUseCase,
    refreshTokenUseCase,
    resendUseCase,
    createUserUseCase,
    guestLoginUseCase
  }) {
    this.registerUseCase = registerUseCase;
    this.loginUseCase = loginUseCase;
    this.googleOAuthUseCase = googleOAuthUseCase;
    this.appleOAuthUseCase = appleOAuthUseCase;
    this.verifyEmailUseCase = verifyEmailUseCase;
    this.forgotPasswordUseCase = forgotPasswordUseCase;
    this.resetPasswordUseCase = resetPasswordUseCase;
    this.logoutUseCase = logoutUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.resendUseCase = resendUseCase;
    this.createUserUseCase = createUserUseCase;
    this.guestLoginUseCase = guestLoginUseCase;
  }

  /**
   * Register new user
   * POST /auth/register
   * Returns: { email, expiresIn } - NO TOKEN
   */
  register = asyncHandler(async (req, res) => {
    const dto = new RegisterDTO(req.body);
    const result = await this.registerUseCase.execute(dto);

    return successResponse(res, result, 201, 'User registered successfully. Please verify your email.');
  });

  /**
   * Login user
   * POST /auth/login
   * Returns: { accessToken, refreshToken, user }
   */
  login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const dto = new LoginDTO({ identifier, password });
    const result = await this.loginUseCase.execute(dto);

    return successResponse(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      firebaseToken: result.firebaseToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.fullName,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
        profilePicture: result.user.profilePicture
      }
    }, 200, 'Login successful');
  });

  /**
   * Google OAuth login/register
   * POST /auth/google/signin
   * Returns: { accessToken, refreshToken, firebaseToken, user }
   */
  googleOAuth = asyncHandler(async (req, res) => {
    const { idToken, serverAuthCode } = req.body;
    const dto = new GoogleOAuthDTO({ idToken, serverAuthCode });
    const result = await this.googleOAuthUseCase.execute(dto);

    return successResponse(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      firebaseToken: result.firebaseToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.fullName,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
        profilePicture: result.user.profilePicture
      }
    }, 200, 'Google sign-in successful');
  });

  /**
   * Apple OAuth login/register
   * POST /auth/apple/signin
   * Body: { identityToken, userData?: { fullName, email, firstName, lastName } }
   * Returns: { accessToken, refreshToken, firebaseToken, user }
   */
  appleOAuth = asyncHandler(async (req, res) => {
    const { identityToken, userData } = req.body;
    const dto = new AppleOAuthDTO({ identityToken, userData });
    const result = await this.appleOAuthUseCase.execute(dto);

    return successResponse(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      firebaseToken: result.firebaseToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.fullName,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
        profilePicture: result.user.profilePicture
      }
    }, 200, 'Apple sign-in successful');
  });

  /**
   * Verify email with code
   * POST /auth/verify-email
   * Returns: { accessToken, refreshToken, firebaseToken, user }
   */
  verifyEmail = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.user?.id; // Optional - can find by code alone

    const result = await this.verifyEmailUseCase.execute(userId, code);

    return successResponse(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      firebaseToken: result.firebaseToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.fullName,
        emailVerified: result.user.emailVerified,
        profilePicture: result.user.profilePicture
      }
    }, 200, 'Email verified successfully');
  });

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await this.forgotPasswordUseCase.execute(email);

    return successResponse(res, result);
  });

  /**
   * Reset password with code
   * POST /auth/reset-password
   * Request: { code, password }
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { code, password } = req.body;
    const result = await this.resetPasswordUseCase.execute(code, password);

    return successResponse(res, result, 200, 'Password reset successfully');
  });

  /**
   * Refresh access token
   * POST /auth/refresh-token
   * Returns: { accessToken, refreshToken }
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await this.refreshTokenUseCase.execute(refreshToken);

    return successResponse(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    }, 200, 'Token refreshed successfully');
  });

  /**
   * Resend verification or reset code
   * POST /auth/resend
   * Request: { email, type: "verification" | "reset" }
   */
  resend = asyncHandler(async (req, res) => {
    const { email, type } = req.body;

    const result = await this.resendUseCase.execute(email, type);

    return successResponse(res, result.data, 200, result.message);
  });

  /**
   * Create user (quick creation with random password)
   * POST /auth/create-user
   * Request: { email, fullName }
   * Returns: { accessToken }
   */
  createUser = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    const result = await this.createUserUseCase.execute(email, fullName);

    return successResponse(res, result, 200, 'User created successfully');
  });

  /**
   * Guest login
   * POST /auth/guest
   * Returns: { accessToken, refreshToken, firebaseToken, user }
   */
  guestLogin = asyncHandler(async (req, res) => {
    const result = await this.guestLoginUseCase.execute();

    return successResponse(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      firebaseToken: result.firebaseToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.fullName,
        role: result.user.role,
        isGuest: result.user.isGuest,
        emailVerified: result.user.emailVerified,
        profilePicture: result.user.profilePicture
      }
    }, 200, 'Guest login successful');
  });
}

module.exports = AuthController;

