/**
 * Update Member Role Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError } = require('../errors');
const { ValidationError } = require('../../common/errors');

class UpdateMemberRoleUseCase {
  constructor({
    groupRepository
  }) {
    this.groupRepository = groupRepository;
  }

  async execute(groupId, userId, memberId, role) {
    if (!['admin', 'member'].includes(role)) {
      throw new ValidationError('Role must be either "admin" or "member"');
    }

    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.isAdmin(userId)) {
      throw new GroupAccessDeniedError('Only group admins can update member roles');
    }

    const updatedGroup = await this.groupRepository.updateMemberRole(groupId, memberId, role);

    return updatedGroup.toJSON();
  }
}

module.exports = UpdateMemberRoleUseCase;

