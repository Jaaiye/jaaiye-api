/**
 * Event Participant Repository Implementation
 * Implements IEventParticipantRepository interface
 */

const IEventParticipantRepository = require('../../../domain/repositories/IEventParticipantRepository');
const EventParticipantSchema = require('../schemas/EventParticipant.schema');
const EventParticipantEntity = require('../../../domain/entities/EventParticipant.entity');

class EventParticipantRepository extends IEventParticipantRepository {
  /**
   * Convert Mongoose document to entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;

    const docObj = doc.toObject ? doc.toObject() : doc;

    return new EventParticipantEntity({
      id: docObj._id?.toString() || docObj.id,
      event: docObj.event,
      user: docObj.user,
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

