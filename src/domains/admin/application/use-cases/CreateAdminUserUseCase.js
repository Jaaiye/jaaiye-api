/**
 * Create Admin User Use Case
 * Application layer - business logic
 */

const { UserRepository } = require('../../../shared/infrastructure/persistence/repositories');
const { ValidationError, BadRequestError, EmailAlreadyInUseError } = require('../../../shared/domain/errors');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, VALID_ROLES } = require('../../../../constants/adminConstants');

class CreateAdminUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ email, fullName, username, password, role = 'admin', isActive = true }) {
    if (!email || !fullName || !password) {
      throw new ValidationError(ERROR_MESSAGES.REQUIRED_FIELDS);
    }

    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestError(ERROR_MESSAGES.INVALID_ROLE);
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new EmailAlreadyInUseError();
    }

    const user = await this.userRepository.create({
      email,
      username: username || email.split('@')[0],
      fullName,
      password,
      role,
      isActive,
      emailVerified: true
    });

    return {
      message: SUCCESS_MESSAGES.USER_CREATED,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    };
  }
}

module.exports = CreateAdminUserUseCase;


