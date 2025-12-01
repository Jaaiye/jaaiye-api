/**
 * Event Repository Implementation
 * Implements IEventRepository interface
 */

const IEventRepository = require('../../../domain/repositories/IEventRepository');
const EventSchema = require('../schemas/Event.schema');
const EventEntity = require('../../../domain/entities/Event.entity');
const { EventNotFoundError } = require('../../../domain/errors');

class EventRepository extends IEventRepository {
  /**
   * Convert Mongoose document to entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;

    const docObj = doc.toObject ? doc.toObject() : doc;

    return new EventEntity({
      id: docObj._id?.toString() || docObj.id,
      calendar: docObj.calendar,
      title: docObj.title,
      description: docObj.description,
      startTime: docObj.startTime,
      endTime: docObj.endTime,
      isAllDay: docObj.isAllDay,
      category: docObj.category,
      privacy: docObj.privacy,
      status: docObj.status,
      ticketTypes: docObj.ticketTypes || [],
      ticketFee: docObj.ticketFee,
      attendeeCount: docObj.attendeeCount || 0,
      image: docObj.image,
      venue: docObj.venue,
      reminders: docObj.reminders || [],
      external: docObj.external || {},
      createdBy: docObj.createdBy,
      createdAt: docObj.createdAt,
      updatedAt: docObj.updatedAt
    });
  }

  async create(eventData) {
    const doc = await EventSchema.create(eventData);
    return this._toEntity(doc);
  }

  async findById(id) {
    const doc = await EventSchema.findById(id).lean();
    return this._toEntity(doc);
  }

  async findBySlug(slug) {
    const doc = await EventSchema.findOne({ slug }).lean();
    return this._toEntity(doc);
  }

  async find(filters, options = {}) {
    const { limit = 20, skip = 0, sort = { startTime: 1 } } = options;

    const [docs, total] = await Promise.all([
      EventSchema.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      EventSchema.countDocuments(filters)
    ]);

    return {
      events: docs.map(doc => this._toEntity(doc)),
      total
    };
  }

  async update(id, updateData) {
    const doc = await EventSchema.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!doc) {
      throw new EventNotFoundError();
    }

    return this._toEntity(doc);
  }

  async delete(id) {
    const result = await EventSchema.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async addTicketType(eventId, ticketTypeData) {
    const doc = await EventSchema.findById(eventId);
    if (!doc) {
      throw new EventNotFoundError();
    }

    doc.ticketTypes.push(ticketTypeData);
    await doc.save();

    return this._toEntity(doc);
  }

  async updateTicketType(eventId, ticketTypeId, updateData) {
    const doc = await EventSchema.findById(eventId);
    if (!doc) {
      throw new EventNotFoundError();
    }

    const ticketType = doc.ticketTypes.id(ticketTypeId);
    if (!ticketType) {
      throw new Error('Ticket type not found');
    }

    Object.assign(ticketType, updateData);
    await doc.save();

    return this._toEntity(doc);
  }

  async removeTicketType(eventId, ticketTypeId) {
    const doc = await EventSchema.findById(eventId);
    if (!doc) {
      throw new EventNotFoundError();
    }

    doc.ticketTypes.pull(ticketTypeId);
    await doc.save();

    return this._toEntity(doc);
  }
}

module.exports = EventRepository;

