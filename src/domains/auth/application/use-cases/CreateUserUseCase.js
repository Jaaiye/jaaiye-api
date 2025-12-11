/**
 * Create User Use Case
 * Quick user creation with random password (for special flows)
 */

const { ValidationError } = require('../../domain/errors');
const { PasswordService, TokenService } = require('../../../shared/domain/services');
const { UserEntity } = require('../../../shared/domain/entities');

class CreateUserUseCase {
  constructor({ userRepository, calendarAdapter }) {
    this.userRepository = userRepository;
    this.calendarAdapter = calendarAdapter;
  }

  /**
   * Execute quick user creation
   * @param {string} email - User email
   * @param {string} fullName - User full name
   * @returns {Promise<Object>} { accessToken }
   */
  async execute(email, fullName) {
    if (!email || !fullName) {
      throw new ValidationError('Email and fullName are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      // Return token for existing user
      const userEntity = new UserEntity(existing);
      const accessToken = TokenService.generateAccessToken(userEntity);

      return { accessToken };
    }

    // Generate random password
    const randomPassword = PasswordService.generateRandomPassword(32);
    const hashedPassword = await PasswordService.hash(randomPassword);

    // Generate username from email
    const username = normalizedEmail.split('@')[0];

    // Create user (email pre-verified)
    const user = await this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      username,
      fullName,
      emailVerified: true, // Pre-verified for quick creation
      role: 'user',
      isActive: true,
      isBlocked: false
    });

    // Create default calendar (async, non-blocking)
    if (this.calendarAdapter) {
      this.calendarAdapter.createOnRegistration(user).catch(err => {
        console.error('Failed to create default calendar:', err);
      });
    }

    // Generate token
    const userEntity = new UserEntity(user);
    const accessToken = TokenService.generateAccessToken(userEntity);

    return { accessToken, user: userEntity };
  }
}

module.exports = CreateUserUseCase;

