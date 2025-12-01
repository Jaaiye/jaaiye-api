/**
 * Search Groups Use Case
 * Application layer - use case
 */

const { ValidationError } = require('../../../shared/domain/errors');

class SearchGroupsUseCase {
  constructor({
    groupRepository
  }) {
    this.groupRepository = groupRepository;
  }

  async execute(searchTerm, userId, limit = 20) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    const groups = await this.groupRepository.search(searchTerm.trim(), userId, limit);

    return groups.map(group => group.toJSON());
  }
}

module.exports = SearchGroupsUseCase;

