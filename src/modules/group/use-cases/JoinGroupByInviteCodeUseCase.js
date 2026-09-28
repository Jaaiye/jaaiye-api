/**
 * Join Group By Invite Code Use Case
 * Application layer - use case
 *
 * Self-service join via a shareable code - a distinct authorization path
 * from AddMemberUseCase (which requires an existing member with
 * allowMemberInvites to add someone by ID). Holding a valid code is the
 * authorization here; there's no separate permission check on the joiner.
 *
 * Idempotent by design: this gets called both as a fresh join and as a
 * resume-after-signup retry (the mobile client re-fires it after auth
 * completes without necessarily knowing whether it already succeeded
 * once before), so an already-a-member call must succeed quietly rather
 * than throwing UserAlreadyMemberError.
 */

const { GroupNotFoundError } = require('../errors');

class JoinGroupByInviteCodeUseCase {
  constructor({ groupRepository }) {
    this.groupRepository = groupRepository;
  }

  async execute(inviteCode, userId) {
    const group = await this.groupRepository.findByInviteCode(inviteCode);

    if (!group) {
      throw new GroupNotFoundError('Invite link is invalid or has expired');
    }

    if (group.isMember(userId)) {
      return group.toJSON();
    }

    const updatedGroup = await this.groupRepository.addMember(group.id, userId, userId, 'member');
    return updatedGroup.toJSON();
  }
}

module.exports = JoinGroupByInviteCodeUseCase;
