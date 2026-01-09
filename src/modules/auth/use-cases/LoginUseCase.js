/**
 * Login Use Case
 * Handles user login business logic
 */

const { InvalidCredentialsError, EmailNotVerifiedError } = require('../errors');
const { NotFoundError } = require('../../common/errors');
const { PasswordService, TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');
const { addMinutesToNow, addDaysToNow } = require('../../../utils/dateUtils');

class LoginUseCase {
  constructor({ userRepository, firebaseAdapter, emailQueue }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
    this.emailQueue = emailQueue;
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

    // Create user entity to check business rules
    const userEntity = new UserEntity(user);

    // Check if email is verified - if not, send verification email before throwing error
    if (!userEntity.emailVerified) {
      // Generate new verification code
      const verificationCode = PasswordService.generateVerificationCode();
      const codeExpiry = addMinutesToNow(10); // 10 minutes from now (UTC)

      // Update verification code in database
      await this.userRepository.setVerificationCode(userEntity.id, verificationCode, codeExpiry);

      // Send verification email (async, don't wait for it)
      if (this.emailQueue) {
        this.emailQueue.sendVerificationEmailAsync(
          userEntity.email,
          verificationCode,
          userEntity.fullName || 'User'
        ).catch(err => {
          console.error('[LoginUseCase] Failed to send verification email:', err);
        });
      }

      // Throw error after sending email
      throw new EmailNotVerifiedError('Please verify your email before logging in. A verification email has been sent.');
    }

    // Check if user can login (will throw if blocked)
    userEntity.canLogin();

    // Generate tokens
    const accessToken = TokenService.generateAccessToken(userEntity);
    const refreshToken = TokenService.generateRefreshToken(userEntity.id);
    const firebaseToken = this.firebaseAdapter
      ? await this.firebaseAdapter.generateToken(userEntity.id)
      : null;

    // Save refresh token to user
    const refreshExpiry = addDaysToNow(90); // 90 days from now (UTC)
    await this.userRepository.updateRefreshData(userEntity.id, {
      refreshToken,
      firebaseToken,
      refreshExpiry
    });


    return {
      user: userEntity,
      accessToken,
      refreshToken,
      firebaseToken
    };
  }
}

module.exports = LoginUseCase;

