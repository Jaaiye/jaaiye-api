/**
 * Friend Request Repository Implementation
 * Implements IFriendRequestRepository interface
 */

const { IFriendRequestRepository } = require('./interfaces');
const FriendRequestSchema = require('../../common/entities/FriendRequest.schema');
const FriendRequestEntity = require('../entities/FriendRequest.entity');
const { FriendRequestNotFoundError } = require('../errors');

class FriendRequestRepository extends IFriendRequestRepository {
  /**
   * Convert Mongoose document to entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;

    // Handle populated fields - extract ID if it's an object
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

    const entity = new FriendRequestEntity({
      id: doc._id.toString(),
      requester: getUserId(doc.requester),
      recipient: getUserId(doc.recipient),
      status: doc.status,
      message: doc.message,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });

    // Attach populated user data if available
    if (doc.requester && typeof doc.requester === 'object' && doc.requester._id) {
      entity._populatedRequester = getUserData(doc.requester);
    }
    if (doc.recipient && typeof doc.recipient === 'object' && doc.recipient._id) {
      entity._populatedRecipient = getUserData(doc.recipient);
    }

    return entity;
  }

  async findById(requestId) {
    const doc = await FriendRequestSchema.findById(requestId)
      .populate('requester', 'username fullName profilePicture')
      .populate('recipient', 'username fullName profilePicture');
    return this._toEntity(doc);
  }

  async create(requesterId, recipientId, message) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const doc = await FriendRequestSchema.create({
      requester: requesterId,
      recipient: recipientId,
      message: message?.trim(),
      status: 'pending',
      expiresAt
    });

    return this._toEntity(doc);
  }

  async findPendingRequest(requesterId, recipientId) {
    const doc = await FriendRequestSchema.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ],
      status: 'pending'
    })
      .populate('requester', 'username fullName profilePicture email')
      .populate('recipient', 'username fullName profilePicture email');
    return this._toEntity(doc);
  }

  async getPendingRequests(userId, type = 'received') {
    const query = { status: 'pending' };

    if (type === 'received') {
      query.recipient = userId;
    } else if (type === 'sent') {
      query.requester = userId;
    } else {
      query.$or = [
        { requester: userId },
        { recipient: userId }
      ];
    }

    const docs = await FriendRequestSchema.find(query)
      .populate('requester', 'username fullName profilePicture')
      .populate('recipient', 'username fullName profilePicture')
      .sort({ createdAt: -1 });

    return docs.map(doc => this._toEntity(doc));
  }

  async updateStatus(requestId, status) {
    const doc = await FriendRequestSchema.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    )
      .populate('requester', 'username fullName profilePicture')
      .populate('recipient', 'username fullName profilePicture');

    if (!doc) {
      throw new FriendRequestNotFoundError();
    }

    return this._toEntity(doc);
  }

  async requestExists(requesterId, recipientId) {
    const doc = await FriendRequestSchema.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ],
      status: { $in: ['pending', 'accepted'] }
    });
    return !!doc;
  }

  async cleanupExpired() {
    const result = await FriendRequestSchema.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() }
      },
      { status: 'cancelled' }
    );
    return result.modifiedCount;
  }
}

module.exports = FriendRequestRepository;

