/**
 * Update Group Use Case
 * Application layer - use case
 */

const { GroupNotFoundError, GroupAccessDeniedError } = require('../errors');

class UpdateGroupUseCase {
  constructor({
    groupRepository,
    firebaseAdapter
  }) {
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  async execute(groupId, userId, dto) {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.isAdmin(userId)) {
      throw new GroupAccessDeniedError('Only group admins can update the group');
    }

    const updateData = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.settings !== undefined) updateData.settings = dto.settings;

    const updatedGroup = await this.groupRepository.update(groupId, updateData);

    // Sync to Firebase (non-blocking)
    setImmediate(async () => {
      try {
        await this.firebaseAdapter.updateGroup(groupId, {
          name: updatedGroup.name,
          description: updatedGroup.description,
          settings: updatedGroup.settings,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to update group in Firebase:', error);
      }
    });

    return updatedGroup.toJSON();
  }
}

module.exports = UpdateGroupUseCase;

