/**
 * Friendship Repository Implementation
 * Implements IFriendshipRepository interface
 */

const IFriendshipRepository = require('../../../domain/repositories/IFriendshipRepository');
const FriendshipSchema = require('../../../../shared/infrastructure/persistence/schemas/Friendship.schema');
const FriendshipEntity = require('../../../domain/entities/Friendship.entity');
const { FriendshipAlreadyExistsError, FriendshipNotFoundError } = require('../../../domain/errors');

class FriendshipRepository extends IFriendshipRepository {
  /**
   * Convert Mongoose document to entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;

    // Handle populated user fields - extract ID if it's an object
    const getUserId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (field._id) return field._id.toString();
      if (field.toString) return field.toString();
      return field;
    };

    // Extract populated user data if available
    const getUserData = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return null; // Just an ID, not populated
      if (field._id) {
        // Populated user object
        return {
          id: field._id.toString(),
          username: field.username,
          fullName: field.fullName,
          profilePicture: field.profilePicture,
          email: field.email
        };
      }
      return null;
    };

    const entity = new FriendshipEntity({
      id: doc._id.toString(),
      user1: getUserId(doc.user1),
      user2: getUserId(doc.user2),
      status: doc.status,
      initiatedBy: getUserId(doc.initiatedBy),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });

    // Attach populated user data if available (for GetFriends use case)
    if (doc.user1 && typeof doc.user1 === 'object' && doc.user1._id) {
      entity._populatedUser1 = getUserData(doc.user1);
    }
    if (doc.user2 && typeof doc.user2 === 'object' && doc.user2._id) {
      entity._populatedUser2 = getUserData(doc.user2);
    }

    return entity;
  }

  /**
   * Normalize user IDs (ensure user1 < user2)
   * @private
   */
  _normalizeUserIds(user1Id, user2Id) {
    const user1Str = user1Id.toString();
    const user2Str = user2Id.toString();
    return user1Str < user2Str ? [user1Id, user2Id] : [user2Id, user1Id];
  }

  async findFriendship(user1Id, user2Id) {
    const [user1, user2] = this._normalizeUserIds(user1Id, user2Id);
    const doc = await FriendshipSchema.findOne({ user1, user2 });
    return this._toEntity(doc);
  }

  async create(user1Id, user2Id, initiatedBy) {
    const [user1, user2] = this._normalizeUserIds(user1Id, user2Id);

    // Check if already exists
    const existing = await FriendshipSchema.findOne({ user1, user2 });
    if (existing) {
      throw new FriendshipAlreadyExistsError();
    }

    const doc = await FriendshipSchema.create({
      user1,
      user2,
      initiatedBy,
      status: 'active'
    });

    return this._toEntity(doc);
  }

  async getFriends(userId, status = 'active') {
    const docs = await FriendshipSchema.find({
      $or: [
        { user1: userId, status },
        { user2: userId, status }
      ]
    })
    .populate('user1', 'username fullName profilePicture email')
    .populate('user2', 'username fullName profilePicture email')
    .sort({ createdAt: -1 });

    return docs.map(doc => this._toEntity(doc));
  }

  async areFriends(user1Id, user2Id) {
    const friendship = await this.findFriendship(user1Id, user2Id);
    return friendship && friendship.isActive();
  }

  async remove(user1Id, user2Id) {
    const friendship = await this.findFriendship(user1Id, user2Id);
    if (!friendship) {
      throw new FriendshipNotFoundError();
    }
    await FriendshipSchema.findByIdAndDelete(friendship.id);
  }

  async block(user1Id, user2Id, blockedBy) {
    const [user1, user2] = this._normalizeUserIds(user1Id, user2Id);

    let doc = await FriendshipSchema.findOne({ user1, user2 });

    if (!doc) {
      // Create new blocked friendship
      doc = await FriendshipSchema.create({
        user1,
        user2,
        initiatedBy: blockedBy,
        status: 'blocked'
      });
    } else {
      // Update existing to blocked
      doc.status = 'blocked';
      doc.blockedBy = blockedBy;
      doc.blockedAt = new Date();
      await doc.save();
    }

    return this._toEntity(doc);
  }

  async unblock(user1Id, user2Id) {
    const friendship = await this.findFriendship(user1Id, user2Id);
    if (!friendship) {
      throw new FriendshipNotFoundError();
    }

    const doc = await FriendshipSchema.findById(friendship.id);
    doc.status = 'active';
    doc.blockedBy = undefined;
    doc.blockedAt = undefined;
    await doc.save();

    return this._toEntity(doc);
  }

  async getMutualFriends(user1Id, user2Id) {
    // Get friends of user1
    const user1Friends = await this.getFriends(user1Id);
    const user1FriendIds = new Set(
      user1Friends.map(f => {
        const friend = f.user1.toString() === user1Id.toString() ? f.user2 : f.user1;
        return friend.toString();
      })
    );

    // Get friends of user2
    const user2Friends = await this.getFriends(user2Id);
    const user2FriendIds = new Set(
      user2Friends.map(f => {
        const friend = f.user1.toString() === user2Id.toString() ? f.user2 : f.user1;
        return friend.toString();
      })
    );

    // Find intersection
    const mutualFriendIds = Array.from(user1FriendIds).filter(id => user2FriendIds.has(id));
    return mutualFriendIds;
  }
}

module.exports = FriendshipRepository;

