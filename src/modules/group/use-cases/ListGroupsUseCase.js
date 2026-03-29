/**
 * List Groups Use Case
 * Application layer - use case
 */

class ListGroupsUseCase {
    constructor({ groupRepository }) {
        this.groupRepository = groupRepository;
    }

    async execute(options = {}) {
        const filters = {};
        if (options.isActive !== undefined) {
            filters.isActive = options.isActive;
        }

        const { groups, total } = await this.groupRepository.find(filters, {
            page: parseInt(options.page) || 1,
            limit: parseInt(options.limit) || 20,
            sort: options.sort || { createdAt: -1 }
        });

        return {
            groups: groups.map(group => group.toJSON()),
            pagination: {
                page: parseInt(options.page) || 1,
                limit: parseInt(options.limit) || 20,
                total,
                pages: Math.ceil(total / (parseInt(options.limit) || 20))
            }
        };
    }
}

module.exports = ListGroupsUseCase;
