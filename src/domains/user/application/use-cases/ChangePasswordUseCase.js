/**
 * Change Password Use Case
 * Application layer - use case
 */

const { UserNotFoundError, InvalidPasswordError } = require('../../../shared/domain/errors');
const { PasswordService } = require('../../../shared/domain/services');

class ChangePasswordUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute change password
   * @param {string} userId - User ID
   * @param {ChangePasswordDTO} dto - Change password DTO
   * @returns {Promise<void>}
   */
  async execute(userId, dto) {
    dto.validate();

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Verify current password
    const isMatch = await PasswordService.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new InvalidPasswordError('Current password is incorrect');
    }

    // Hash and update password
    const hashedPassword = await PasswordService.hash(dto.newPassword);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }
}

module.exports = ChangePasswordUseCase;

