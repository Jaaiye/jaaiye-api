/**
 * Reset Password Use Case
 * Reads reset code from Redis (not DB).
 * Requires userId in the request body alongside the code.
 */

const { ValidationError } = require('../errors');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');

class ResetPasswordUseCase {
  constructor({ userRepository, redisAuthService }) {
    this.userRepository = userRepository;
    this.redisAuthService = redisAuthService;
  }

  /**
   * Execute password reset
   * @param {string} email - User email (to look up userId)
   * @param {string} code - Reset code
   * @param {string} password - New password
   * @returns {Promise<Object>} { success, message }
   */
  async execute(email, code, password) {
    if (!email || !code || !password) {
      throw new ValidationError('Email, code, and password are required');
    }

    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Consume reset code from Redis (get + delete atomically)
    const storedCode = await this.redisAuthService.consumeResetCode(user.id);

    if (!storedCode) {
      throw new BadRequestError('Reset code has expired or does not exist. Please request a new one.');
    }

    if (storedCode !== code) {
      // Restore code so user can retry without re-requesting
      await this.redisAuthService.storeResetCode(user.id, storedCode);
      throw new BadRequestError('Invalid reset code');
    }

    const hashedPassword = await PasswordService.hash(password);

    // Update password only — $unset resetPassword no longer needed (not stored in DB)
    await this.userRepository.updatePassword(user.id, hashedPassword);

    // Invalidate all active sessions for security after password reset
    await this.redisAuthService.deleteAllRefreshTokens(user.id);

    return {
      success: true,
      message: 'Password reset successfully. Please login again.'
    };
  }
}

module.exports = ResetPasswordUseCase;
