/**
 * Event Participant Repository Implementation
 * Implements IEventParticipantRepository interface
 */

const { IEventParticipantRepository } = require('./interfaces');
const EventParticipantSchema = require('../entities/EventParticipant.schema');
const EventParticipantEntity = require('../entities/EventParticipant.entity');

class EventParticipantRepository extends IEventParticipantRepository {
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

    return new EventParticipantEntity({
      id: safeString(docObj._id || docObj.id),
      event: docObj.event, // Keep as is (populated or ID)
      user: docObj.user, // Keep as is (populated or ID)
      role: docObj.role,
      status: docObj.status,
      responseTime: docObj.responseTime,
      reminders: docObj.reminders || [],
      createdAt: docObj.createdAt,
      updatedAt: docObj.updatedAt
    });
  }

  async create(participantData) {
    const doc = await EventParticipantSchema.create(participantData);
    return this._toEntity(doc);
  }

  async createMany(participantsData) {
    const docs = await EventParticipantSchema.insertMany(participantsData, { ordered: false });
    return docs.map(doc => this._toEntity(doc));
  }

  async findById(id) {
    const doc = await EventParticipantSchema.findById(id).lean();
    return this._toEntity(doc);
  }

  async findByEventAndUser(eventId, userId) {
    const doc = await EventParticipantSchema.findOne({
      event: eventId,
      user: userId
    }).lean();

    return this._toEntity(doc);
  }

  async findByEvent(eventId, options = {}) {
    const { populate = [] } = options;
    let query = EventParticipantSchema.find({ event: eventId });

    populate.forEach(field => {
      query = query.populate(field);
    });

    const docs = await query.lean();
    return docs.map(doc => this._toEntity(doc));
  }

  async findByUser(userId, options = {}) {
    const { populate = [] } = options;
    let query = EventParticipantSchema.find({ user: userId });

    populate.forEach(field => {
      query = query.populate(field);
    });

    const docs = await query.lean();
    return docs.map(doc => this._toEntity(doc));
  }

  async update(id, updateData) {
    const doc = await EventParticipantSchema.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!doc) {
      return null;
    }

    return this._toEntity(doc);
  }

  async delete(id) {
    const result = await EventParticipantSchema.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async deleteByEventAndUser(eventId, userId) {
    const result = await EventParticipantSchema.deleteOne({
      event: eventId,
      user: userId
    });
    return result.deletedCount > 0;
  }

  async isParticipant(eventId, userId) {
    const count = await EventParticipantSchema.countDocuments({
      event: eventId,
      user: userId
    });
    return count > 0;
  }
}

module.exports = EventParticipantRepository;

