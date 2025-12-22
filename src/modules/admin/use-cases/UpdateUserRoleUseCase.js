/**
 * Update User Role Use Case
 * Application layer - business logic
 */

const { UserRepository } = require('../../common/repositories');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { ERROR_MESSAGES, VALID_ROLES } = require('../../../constants/adminConstants');

class UpdateUserRoleUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userId, role) {
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestError(ERROR_MESSAGES.INVALID_ROLE);
    }

    const user = await this.userRepository.update(userId, { role });
    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    };
  }
}

module.exports = UpdateUserRoleUseCase;


