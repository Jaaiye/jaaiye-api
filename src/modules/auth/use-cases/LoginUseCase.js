/**
 * Login Use Case
 * Handles user authentication.
 * Refresh tokens stored in Redis. lastLogin is fire-and-forget.
 */

const { InvalidCredentialsError, EmailNotVerifiedError } = require('../errors');
const { NotFoundError } = require('../../common/errors');
const { PasswordService, TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');
const { addMinutesToNow } = require('../../../utils/dateUtils');

class LoginUseCase {
  constructor({ userRepository, firebaseAdapter, emailQueue, redisAuthService }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailQueue = emailQueue;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute login
   * @param {LoginDTO} dto - Login data
   * @returns {Promise<Object>} { user, accessToken, refreshToken }
   */
  async execute(dto) {
    // Validate DTO
    const validation = dto.validate();
    if (!validation.valid) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    // Find user by email or username
    let user;
    if (dto.isEmail()) {
      user = await this.userRepository.findByEmail(dto.identifier);
    } else {
      user = await this.userRepository.findByUsername(dto.identifier);
    }

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    const isPasswordValid = await PasswordService.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    const userEntity = new UserEntity(user);

    // Check if email is verified — resend code before throwing
    if (!userEntity.emailVerified) {
      const verificationCode = PasswordService.generateVerificationCode();
      const codeExpiry = addMinutesToNow(10);

      await this.redisAuthService.storeVerifyCode(userEntity.id, verificationCode, 10 * 60);

      if (this.emailQueue) {
        this.emailQueue.sendVerificationEmailAsync(
          userEntity.email,
          verificationCode,
          userEntity.fullName || 'User'
        ).catch(err => {
          console.error('[LoginUseCase] Failed to send verification email:', err);
        });
      }

      throw new EmailNotVerifiedError('Please verify your email before logging in. A verification email has been sent.');
    }

    userEntity.canLogin();

    // Generate tokens
    const accessToken = TokenService.generateAccessToken(userEntity);
    const refreshToken = TokenService.generateRefreshToken(userEntity.id);
    const firebaseToken = this.firebaseAdapter
      ? await this.firebaseAdapter.generateToken(userEntity.id)
      : null;

    // Decode refresh token to get jti
    const decoded = TokenService.verifyRefreshToken(refreshToken);

    // Store refresh session in Redis
    await this.redisAuthService.storeRefreshToken(userEntity.id, decoded.jti);

    // Record lastLogin (Redis immediately + fire-and-forget DB flush)
    await this.redisAuthService.recordLastLogin(userEntity.id, (timestamp) =>
      this.userRepository.updateLastLogin(userEntity.id, timestamp)
    );

    return {
      user: userEntity,
      accessToken,
      refreshToken,
      firebaseToken
    };
  }
}

module.exports = LoginUseCase;
