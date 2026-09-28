/**
 * Get Group Preview By Invite Code Use Case
 * Application layer - use case
 *
 * Unauthenticated-safe preview for someone who has an invite link but
 * hasn't joined (or doesn't have an account) yet. Deliberately returns a
 * thin projection - name, description, creator, member count - never the
 * member list or settings, since holding the link isn't membership.
 */

const { GroupNotFoundError } = require('../errors');

class GetGroupPreviewByInviteCodeUseCase {
  constructor({ groupRepository }) {
    this.groupRepository = groupRepository;
  }

  async execute(inviteCode) {
    const group = await this.groupRepository.findByInviteCode(inviteCode);

    // Same error for "no such code" and "code revoked" - both look
    // identical to the caller, there's nothing to distinguish.
    if (!group) {
      throw new GroupNotFoundError('Invite link is invalid or has expired');
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      creator: group.creator,
      memberCount: group.getMemberCount()
    };
  }
}

module.exports = GetGroupPreviewByInviteCodeUseCase;
