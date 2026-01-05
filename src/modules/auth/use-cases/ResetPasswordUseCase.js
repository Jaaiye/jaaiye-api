/**
 * Reset Password Use Case
 * Handles password reset with code
 */

const { ValidationError } = require('../errors');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');

class ResetPasswordUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute password reset
   * @param {string} code - Reset code
   * @param {string} password - New password
   * @returns {Promise<Object>} { success, message }
   */
  async execute(code, password) {
    if (!code || !password) {
      throw new ValidationError('Code and password are required');
    }

    // Validate password length
    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Find user by reset code
    const user = await this.userRepository.findByResetCode(code);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create user entity to check business rules
    const userEntity = new UserEntity(user);

    // Check if reset code is valid
    if (!userEntity.hasValidResetCode()) {
      throw new BadRequestError('Reset code has expired');
    }

    // Verify code matches
    if (user.resetPassword.code !== code) {
      throw new BadRequestError('Invalid reset code');
    }

    // Hash new password
    const hashedPassword = await PasswordService.hash(password);

    // Update password and clear reset data
    await this.userRepository.updatePassword(user.id, hashedPassword);

    return {
      success: true,
      message: 'Password reset successfully'
    };
  }
}

module.exports = ResetPasswordUseCase;

