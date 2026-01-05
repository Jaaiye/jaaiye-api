/**
 * Update Email Use Case
 * Application layer - use case
 */

const { UserNotFoundError, InvalidPasswordError, EmailAlreadyInUseError, SameEmailError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');
const { EMAIL_CONSTANTS } = require('../../../../constants');

class UpdateEmailUseCase {
  constructor({ userRepository, emailAdapter, notificationAdapter }) {
    this.userRepository = userRepository;
    this.emailAdapter = emailAdapter;
    this.notificationAdapter = notificationAdapter;
  }

  /**
   * Execute update email
   * @param {string} userId - User ID
   * @param {UpdateEmailDTO} dto - Update email DTO
   * @returns {Promise<void>}
   */
  async execute(userId, dto) {
    dto.validate();

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Check if email is the same
    if (user.email === dto.email) {
      throw new SameEmailError();
    }

    // Check if email is already taken
    const emailExists = await this.userRepository.emailExists(dto.email);
    if (emailExists) {
      throw new EmailAlreadyInUseError();
    }

    // Verify current password
    const isMatch = await PasswordService.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new InvalidPasswordError('Current password is incorrect');
    }

    // Generate verification code
    const verificationCode = PasswordService.generateVerificationCode();
    const codeExpiry = new Date(Date.now() + EMAIL_CONSTANTS.VERIFICATION_EXPIRY);

    // Update email and set as unverified
    await this.userRepository.update(userId, {
      email: dto.email,
      emailVerified: false
    });

    // Set verification code
    await this.userRepository.setVerificationCode(userId, verificationCode, codeExpiry);

    // Send verification email in background
    if (this.emailAdapter) {
      this.emailAdapter.sendVerificationEmail({
        to: dto.email,
        name: user.fullName || user.username,
        code: verificationCode
      }).catch(err => {
        console.error('Failed to send verification email:', err);
      });
    }

    // Send notification in background
    if (this.notificationAdapter) {
      this.notificationAdapter.send(userId, {
        title: 'Email Update',
        body: 'Please verify your new email address',
        data: { type: 'email_update' }
      }).catch(err => {
        console.error('Failed to send notification:', err);
      });
    }
  }
}

module.exports = UpdateEmailUseCase;

