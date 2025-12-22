/**
 * List Users Use Case
 * Application layer - business logic
 */

const { UserRepository } = require('../../common/repositories');

class ListUsersUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ limit = 20, page = 1, role }) {
    const filters = {};
    if (role) filters.role = role;

    const result = await this.userRepository.find(filters, {
      limit: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      sort: { createdAt: -1 },
      select: 'email username fullName role emailVerified isActive createdAt'
    });

    return {
      users: result.users.map(u => u.toJSON ? u.toJSON() : u)
    };
  }
}

module.exports = ListUsersUseCase;


