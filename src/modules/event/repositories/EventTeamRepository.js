/**
 * Event Team Repository
 * Infrastructure layer - persistence for event team members (ticketed events only)
 */

const EventTeam = require('../entities/EventTeam.schema');
const EventTeamEntity = require('../entities/EventTeam.entity');

class EventTeamRepository {
  _toEntity(doc) {
    if (!doc) return null;
    const docObj = doc.toObject ? doc.toObject() : doc;
    return new EventTeamEntity({
      id: docObj._id?.toString() || docObj.id,
      event: docObj.event?.toString() || docObj.event,
      user: docObj.user?.toString() || docObj.user,
      role: docObj.role,
      invitedBy: docObj.invitedBy?.toString() || docObj.invitedBy,
      status: docObj.status,
      permissions: docObj.permissions || {},
      createdAt: docObj.createdAt,
      updatedAt: docObj.updatedAt
    });
  }

  async create(data) {
    const doc = await EventTeam.create(data);
    return this._toEntity(doc);
  }

  async findById(id) {
    const doc = await EventTeam.findById(id);
    return this._toEntity(doc);
  }

  async findByEventAndUser(eventId, userId) {
    const doc = await EventTeam.findOne({ event: eventId, user: userId });
    return this._toEntity(doc);
  }

  async findByEvent(eventId) {
    const docs = await EventTeam.find({ event: eventId })
      .populate('user', 'fullName email username')
      .populate('invitedBy', 'fullName email username')
      .sort({ createdAt: -1 });
    return docs.map(doc => this._toEntity(doc));
  }

  async findByUser(userId) {
    const docs = await EventTeam.find({ user: userId, status: 'accepted' })
      .populate('event', 'title startTime category status')
      .sort({ createdAt: -1 });
    return docs.map(doc => this._toEntity(doc));
  }

  async update(id, updateData) {
    const doc = await EventTeam.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return this._toEntity(doc);
  }

  async updateStatus(id, status) {
    return this.update(id, { status, updatedAt: new Date() });
  }

  async updateRole(id, role) {
    return this.update(id, { role, updatedAt: new Date() });
  }

  async delete(id) {
    const doc = await EventTeam.findByIdAndDelete(id);
    return this._toEntity(doc);
  }

  async deleteByEventAndUser(eventId, userId) {
    const doc = await EventTeam.findOneAndDelete({ event: eventId, user: userId });
    return this._toEntity(doc);
  }
}

module.exports = EventTeamRepository;

