/**
 * Register Use Case
 * Handles user registration business logic
 */

const { ValidationError } = require('../errors');
const { EmailAlreadyInUseError, UsernameTakenError } = require('../../common/errors');
const { PasswordService, TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');
const { addDaysToNow } = require('../../../utils/dateUtils');

class RegisterUseCase {
  constructor({ userRepository, emailService, emailQueue, notificationQueue, calendarAdapter }) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.emailQueue = emailQueue;
    this.notificationQueue = notificationQueue;
    this.calendarAdapter = calendarAdapter;
  }

  /**
   * Execute registration
   * @param {RegisterDTO} dto - Registration data
   * @returns {Promise<Object>} { user, token }
   */
  async execute(dto) {
    // Validate DTO
    const validation = dto.validate();
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // Check if email exists
    const emailExists = await this.userRepository.emailExists(dto.email);
    if (emailExists) {
      throw new EmailAlreadyInUseError();
    }

    // Hash password
    const hashedPassword = await PasswordService.hash(dto.password);

    // Generate verification code
    const verificationCode = PasswordService.generateVerificationCode();
    const codeExpiry = addDaysToNow(1); // 24 hours from now (UTC)

    // Create user
    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      emailVerified: false,
      role: 'user',
      isActive: true,
      isBlocked: false,
      verification: {
        code: verificationCode,
        expires: codeExpiry
      }
    });

    // Send verification email (async, non-blocking)
    this._sendVerificationEmail(user, verificationCode).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    // Create default calendar (async, non-blocking)
    if (this.calendarAdapter) {
      this.calendarAdapter.createOnRegistration(user).catch(err => {
        console.error('Failed to create default calendar:', err);
      });
    }

    // NO TOKEN on registration - user must verify email first
    return {
      email: user.email,
      expiresIn: '10 minutes'
    };
  }

  /**
   * Send verification email (private helper)
   * @private
   */
  async _sendVerificationEmail(user, code) {
    if (this.emailQueue) {
      // Use email queue if available (preferred for async processing)
      await this.emailQueue.sendVerificationEmailAsync(
        user.email,
        code,
        user.fullName || 'User'
      );
    } else if (this.emailService) {
      // Fallback to direct email service
      await this.emailService.sendVerificationEmail({
        to: user.email,
        name: user.fullName,
        code
      });
    }
  }
}

module.exports = RegisterUseCase;

