/**
 * Verify Email Use Case
 * Reads verification code from Redis (not DB).
 * Stores refresh session in Redis after successful verification.
 */

const { ValidationError } = require('../errors');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');

class VerifyEmailUseCase {
  constructor({ userRepository, firebaseAdapter, emailService, emailQueue, notificationQueue, redisAuthService }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute email verification
   * @param {string} email - User email
   * @param {string} code - Verification code
   * @returns {Promise<Object>} { accessToken, refreshToken, firebaseToken, user }
   */
  async execute(email, code) {
    if (!email || !code) {
      throw new ValidationError('Email and verification code are required');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestError('Email already verified');
    }

    // Check Redis for the stored verification code
    const storedCode = await this.redisAuthService.consumeVerifyCode(user.id);

    if (!storedCode) {
      throw new BadRequestError('Verification code has expired or does not exist. Please request a new one.');
    }

    if (storedCode !== code) {
      // Put the code back so the user can retry without requesting a new one
      await this.redisAuthService.storeVerifyCode(user.id, storedCode);
      throw new BadRequestError('Invalid verification code');
    }

    // Mark email as verified in DB
    await this.userRepository.markEmailVerified(user.id);

    // Send welcome email (async, non-blocking)
    this._sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    const userEntity = new UserEntity(user);
    userEntity.emailVerified = true;
    userEntity.verification = undefined;
    userEntity.updatedAt = new Date();

    const accessToken = TokenService.generateAccessToken(userEntity);
    const refreshToken = TokenService.generateRefreshToken(userEntity.id);
    const firebaseToken = this.firebaseAdapter
      ? await this.firebaseAdapter.generateToken(userEntity.id)
      : null;

    const decoded = TokenService.verifyRefreshToken(refreshToken);
    await this.redisAuthService.storeRefreshToken(userEntity.id, decoded.jti);

    return {
      accessToken,
      refreshToken,
      firebaseToken,
      user: userEntity
    };
  }

  /** @private */
  async _sendWelcomeEmail(user) {
    if (this.emailQueue) {
      await this.emailQueue.sendWelcomeEmailAsync(
        user.email,
        user.username || user.fullName || 'User'
      );
    } else if (this.emailService) {
      await this.emailService.sendWelcomeEmail({
        to: user.email,
        name: user.username
      });
    }
  }
}

module.exports = VerifyEmailUseCase;
