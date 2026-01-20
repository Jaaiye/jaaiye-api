/**
 * Group Repository Implementation
 * Implements IGroupRepository interface
 */

const { IGroupRepository } = require('./interfaces');
const GroupSchema = require('../entities/Group.schema');
const GroupEntity = require('../entities/Group.entity');

class GroupRepository extends IGroupRepository {
  /**
   * Convert Mongoose document to entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;

    const docObj = doc.toObject ? doc.toObject() : doc;

    // Safe ID extraction helper
    const safeString = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        if (val.toHexString) return val.toHexString();
        if (Buffer.isBuffer(val)) return val.toString('hex');
        if (val._id) return safeString(val._id);
        if (val.id) return safeString(val.id);
      }
      return String(val);
    };

    return new GroupEntity({
      id: safeString(docObj._id || docObj.id),
      name: docObj.name,
      description: docObj.description,
      creator: docObj.creator, // Keep as is (populated object or ID)
      members: (docObj.members || []).map(m => ({
        ...m,
        user: m.user, // Keep as is (populated object or ID)
        addedBy: m.addedBy
      })),
      events: docObj.events || [], // Keep as is (populated event objects or IDs)
      settings: docObj.settings || {},
      isActive: docObj.isActive !== undefined ? docObj.isActive : true,
      createdAt: docObj.createdAt,
      updatedAt: docObj.updatedAt
    });
  }

  async create(groupData) {
    const doc = await GroupSchema.create(groupData);
    const populated = await GroupSchema.findById(doc._id)
      .populate('creator', 'username fullName profilePicture')
      .populate('members.user', 'username fullName profilePicture')
      .populate('members.addedBy', 'username fullName');
    return this._toEntity(populated);
  }

  async findById(id, options = {}) {
    let query = GroupSchema.findById(id);

    if (options.populate) {
      query = query.populate(options.populate);
    } else {
      query = query
        .populate('creator', 'username fullName profilePicture')
        .populate('members.user', 'username fullName profilePicture')
        .populate('members.addedBy', 'username fullName')
        .populate('events', 'title startTime endTime location description');
    }

    const doc = await query.lean();
    return this._toEntity(doc);
  }

  async findByUser(userId, includeInactive = false) {
    const docs = await GroupSchema.getUserGroups(userId, includeInactive).lean();
    return docs.map(doc => this._toEntity(doc));
  }

  async findByEvent(eventId) {
    const doc = await GroupSchema.findOne({ events: eventId, isActive: true }).lean();
    return doc ? this._toEntity(doc) : null;
  }

  async search(searchTerm, userId, limit = 20) {
    const docs = await GroupSchema.searchGroups(searchTerm, userId, limit).lean();
    return docs.map(doc => this._toEntity(doc));
  }

  async update(id, updateData) {
    const doc = await GroupSchema.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('creator', 'username fullName profilePicture')
      .populate('members.user', 'username fullName profilePicture')
      .populate('events', 'title startTime endTime location')
      .lean();

    if (!doc) {
      return null;
    }

    return this._toEntity(doc);
  }

  async delete(id) {
    await GroupSchema.findByIdAndUpdate(id, { isActive: false });
  }

  async addMember(groupId, userId, addedByUserId, role = 'member') {
    const group = await GroupSchema.findById(groupId);
    if (!group) {
      return null;
    }

    await group.addMember(userId, addedByUserId, role);

    const populated = await GroupSchema.findById(groupId)
      .populate('creator', 'username fullName profilePicture')
      .populate('members.user', 'username fullName profilePicture')
      .populate('members.addedBy', 'username fullName')
      .lean();

    return this._toEntity(populated);
  }

  async removeMember(groupId, userId) {
    const group = await GroupSchema.findById(groupId);
    if (!group) {
      return null;
    }

    await group.removeMember(userId);

    const populated = await GroupSchema.findById(groupId)
      .populate('creator', 'username fullName profilePicture')
      .populate('members.user', 'username fullName profilePicture')
      .populate('members.addedBy', 'username fullName')
      .lean();

    return this._toEntity(populated);
  }

  async updateMemberRole(groupId, userId, role) {
    const group = await GroupSchema.findById(groupId);
    if (!group) {
      return null;
    }

    await group.updateMemberRole(userId, role);

    const populated = await GroupSchema.findById(groupId)
      .populate('creator', 'username fullName profilePicture')
      .populate('members.user', 'username fullName profilePicture')
      .populate('members.addedBy', 'username fullName')
      .lean();

    return this._toEntity(populated);
  }

  async addEvent(groupId, eventId) {
    const group = await GroupSchema.findById(groupId);
    if (!group) {
      return null;
    }

    await group.addEvent(eventId);
    return this._toEntity(group.toObject());
  }

  async createFromEvent(eventId, groupName, creatorId) {
    const group = await GroupSchema.createFromEvent(eventId, groupName, creatorId);

    const populated = await GroupSchema.findById(group._id)
      .populate('creator', 'username fullName profilePicture')
      .populate('members.user', 'username fullName profilePicture')
      .populate('events', 'title startTime endTime location')
      .lean();

    return this._toEntity(populated);
  }
}

module.exports = GroupRepository;

