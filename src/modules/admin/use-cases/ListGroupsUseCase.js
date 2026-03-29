/**
 * List Groups Use Case (Admin)
 */

class ListGroupsUseCase {
    constructor({ groupRepository }) {
        this.groupRepository = groupRepository;
    }

    async execute(options = {}) {
        // Admin gets everything by default
        const filters = {};
        if (options.isActive !== undefined) {
            filters.isActive = options.isActive;
        }

        const { groups, total } = await this.groupRepository.find(filters, {
            page: parseInt(options.page) || 1,
            limit: parseInt(options.limit) || 10,
            sort: options.sort || { createdAt: -1 },
            populate: [
                { path: 'creator', select: 'username fullName email' },
                { path: 'members.user', select: 'username fullName email' },
                { path: 'events', select: 'title startTime endTime venue location category' }
            ]
        });

        return {
            groups: groups.map(group => group.toJSON()),
            pagination: {
                page: parseInt(options.page) || 1,
                limit: parseInt(options.limit) || 10,
                total,
                pages: Math.ceil(total / (parseInt(options.limit) || 10))
            }
        };
    }
}

module.exports = ListGroupsUseCase;
