/**
 * Auth Controller
 * Presentation layer - HTTP handlers
 * Uses application use cases
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const { RegisterDTO, LoginDTO, GoogleOAuthDTO, AppleOAuthDTO, ConvertGuestDTO } = require('./dto');

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
    guestLoginUseCase,
    convertGuestUseCase
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
    this.convertGuestUseCase = convertGuestUseCase;
  }

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterDTO'
   *     responses:
   *       201:
   *         description: User registered successfully
   */
  register = asyncHandler(async (req, res) => {
    const dto = new RegisterDTO(req.body);
    const result = await this.registerUseCase.execute(dto);

    return successResponse(res, result, 201, 'User registered successfully. Please verify your email.');
  });

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [identifier, password]
   *             properties:
   *               identifier:
   *                 type: string
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 example: password123
   *     responses:
   *       200:
   *         description: Login successful
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
   *                     accessToken:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *                     user:
   *                       type: object
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
   * @swagger
   * /auth/google/signin:
   *   post:
   *     summary: Google OAuth login/register
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               idToken:
   *                 type: string
   *               serverAuthCode:
   *                 type: string
   *     responses:
   *       200:
   *         description: successful operation
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
   * @swagger
   * /auth/apple/signin:
   *   post:
   *     summary: Apple OAuth login/register
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               identityToken:
   *                 type: string
   *               userData:
   *                 type: object
   *     responses:
   *       200:
   *         description: successful operation
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
   * @swagger
   * /auth/verify-email:
   *   post:
   *     summary: Verify email with code
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [code]
   *             properties:
   *               code:
   *                 type: string
   *     responses:
   *       200:
   *         description: Email verified successfully
   */
  verifyEmail = asyncHandler(async (req, res) => {
    const { email, code } = req.body;

    const result = await this.verifyEmailUseCase.execute(email, code);

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
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email:
   *                 type: string
   *     responses:
   *       200:
   *         description: Reset code sent
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
    const { email, code, password } = req.body;
    const result = await this.resetPasswordUseCase.execute(email, code, password);

    return successResponse(res, result, 200, 'Password reset successfully');
  });

  /**
   * @swagger
   * /auth/refresh-token:
   *   post:
   *     summary: Refresh access token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed
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
   * @swagger
   * /auth/resend:
   *   post:
   *     summary: Resend verification or reset code
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, type]
   *             properties:
   *               email:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [verification, reset]
   *     responses:
   *       200:
   *         description: Code resent
   */
  resend = asyncHandler(async (req, res) => {
    const { email, type } = req.body;

    const result = await this.resendUseCase.execute(email, type);

    return successResponse(res, result.data, 200, result.message);
  });

  /**
   * @swagger
   * /auth/create-user:
   *   post:
   *     summary: Quick user creation (Random password)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, fullName]
   *             properties:
   *               email:
   *                 type: string
   *               fullName:
   *                 type: string
   *     responses:
   *       200:
   *         description: User created
   */
  createUser = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    const result = await this.createUserUseCase.execute(email, fullName);

    return successResponse(res, result, 200, 'User created successfully');
  });

  /**
   * @swagger
   * /auth/guest:
   *   post:
   *     summary: Guest login
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: Guest login successful
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

  /**
   * @swagger
   * /auth/convert-guest:
   *   post:
   *     summary: Convert guest account to permanent
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, fullName]
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               fullName:
   *                 type: string
   *     responses:
   *       200:
   *         description: Account converted
   */
  convertGuest = asyncHandler(async (req, res) => {
    // Requires authentication to know which guest user to convert
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User must be authenticated to convert an account' });
    }

    const dto = new ConvertGuestDTO(req.body);
    const result = await this.convertGuestUseCase.execute(userId, dto);

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
    }, 200, 'Guest account converted successfully. Please verify your email.');
  });
}

module.exports = AuthController;

