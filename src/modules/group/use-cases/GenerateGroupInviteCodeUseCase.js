/**
 * Generate Group Invite Code Use Case
 * Application layer - use case
 *
 * Creates (or regenerates) the group's shareable join code. Regenerating
 * invalidates any previously shared link immediately - there's no
 * separate "revoke" action, generating a fresh one IS the revoke.
 */

const crypto = require('crypto');
const { GroupNotFoundError, GroupAccessDeniedError } = require('../errors');

class GenerateGroupInviteCodeUseCase {
  constructor({ groupRepository }) {
    this.groupRepository = groupRepository;
  }

  async execute(groupId, userId) {
    const group = await this.groupRepository.findById(groupId);

    if (!group) {
      throw new GroupNotFoundError();
    }

    if (!group.isAdmin(userId)) {
      throw new GroupAccessDeniedError('Only a group admin can create or reset the invite link');
    }

    // 24 chars of base64url from 18 random bytes - short enough for a
    // clean link, long enough that guessing one isn't practical.
    const inviteCode = crypto.randomBytes(18).toString('base64url');

    const updatedGroup = await this.groupRepository.setInviteCode(groupId, inviteCode);

    return {
      inviteCode: updatedGroup.inviteCode,
      inviteUrl: `https://groups.jaaiye.com/invite/${updatedGroup.inviteCode}`
    };
  }
}

module.exports = GenerateGroupInviteCodeUseCase;
