/**
 * Calendar Repository Implementation
 * Implements ICalendarRepository interface
 */

const ICalendarRepository = require('./interfaces/ICalendarRepository');
const CalendarSchema = require('../entities/Calendar.schema');
const CalendarEntity = require('../entities/Calendar.entity');
const { CalendarNotFoundError } = require('../errors');

class CalendarRepository extends ICalendarRepository {
  /**
   * Convert Mongoose document to entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;
    return new CalendarEntity({
      id: doc._id.toString(),
      owner: doc.owner,
      name: doc.name,
      description: doc.description,
      color: doc.color,
      isDefault: doc.isDefault,
      isPublic: doc.isPublic,
      sharedWith: doc.sharedWith || [],
      google: doc.google || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }

  async findById(calendarId) {
    const doc = await CalendarSchema.findById(calendarId);
    return this._toEntity(doc);
  }

  async findByOwner(ownerId) {
    const doc = await CalendarSchema.findOne({ owner: ownerId });
    return this._toEntity(doc);
  }

  async findAccessibleByUser(userId) {
    const query = {
      $or: [
        { isPublic: true }
      ]
    };

    // If userId is provided, also include calendars owned by or shared with user
    if (userId) {
      query.$or.push(
        { owner: userId },
        { 'sharedWith.user': userId }
      );
    }

    const docs = await CalendarSchema.find(query);
    return docs.map(doc => this._toEntity(doc));
  }

  async create(data) {
    const doc = await CalendarSchema.create({
      owner: data.owner,
      name: data.name,
      description: data.description,
      color: data.color,
      isDefault: data.isDefault !== undefined ? data.isDefault : true,
      isPublic: data.isPublic !== undefined ? data.isPublic : false,
      sharedWith: data.sharedWith || [],
      google: data.google || {}
    });
    return this._toEntity(doc);
  }

  async update(calendarId, updates) {
    const doc = await CalendarSchema.findByIdAndUpdate(
      calendarId,
      { $set: updates },
      { new: true }
    );
    if (!doc) {
      throw new CalendarNotFoundError();
    }
    return this._toEntity(doc);
  }

  async delete(calendarId) {
    const doc = await CalendarSchema.findByIdAndDelete(calendarId);
    if (!doc) {
      throw new CalendarNotFoundError();
    }
  }

  async userHasCalendar(ownerId) {
    const count = await CalendarSchema.countDocuments({ owner: ownerId });
    return count > 0;
  }
}

module.exports = CalendarRepository;

