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

    const { users, total } = await this.userRepository.find(filters, {
      limit: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      sort: { createdAt: -1 }
    });

    return {
      // toObject() strips password/tokens/verification codes - never serialize
      // the raw entity, it carries the password hash as a plain property
      users: users.map(u => u.toObject()),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    };
  }
}

module.exports = ListUsersUseCase;
