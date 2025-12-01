/**
 * Notification Repository Implementation
 * Implements INotificationRepository interface
 */

const INotificationRepository = require('../../../domain/repositories/INotificationRepository');
const NotificationSchema = require('../schemas/Notification.schema');
const NotificationEntity = require('../../../domain/entities/Notification.entity');

class NotificationRepository extends INotificationRepository {
  /**
   * Convert Mongoose document to entity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;

    const docObj = doc.toObject ? doc.toObject() : doc;

    return new NotificationEntity({
      id: docObj._id?.toString() || docObj.id,
      user: docObj.user,
      title: docObj.title,
      message: docObj.message,
      type: docObj.type,
      data: docObj.data || {},
      read: docObj.read || false,
      priority: docObj.priority || 'medium',
      createdAt: docObj.createdAt,
      updatedAt: docObj.updatedAt
    });
  }

  async create(notificationData) {
    const doc = await NotificationSchema.create(notificationData);
    return this._toEntity(doc);
  }

  async findById(id) {
    const doc = await NotificationSchema.findById(id).lean();
    return this._toEntity(doc);
  }

  async findByUser(userId, filters = {}, options = {}) {
    const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;

    const query = { user: userId, ...filters };

    const [docs, total] = await Promise.all([
      NotificationSchema.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationSchema.countDocuments(query)
    ]);

    return {
      notifications: docs.map(doc => this._toEntity(doc)),
      total
    };
  }

  async update(id, updateData) {
    const doc = await NotificationSchema.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!doc) {
      return null;
    }

    return this._toEntity(doc);
  }

  async updateMany(filter, updateData) {
    const result = await NotificationSchema.updateMany(filter, { $set: updateData });
    return result.modifiedCount || result.nModified || 0;
  }

  async delete(id) {
    const result = await NotificationSchema.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async deleteMany(filter) {
    const result = await NotificationSchema.deleteMany(filter);
    return result.deletedCount || 0;
  }
}

module.exports = NotificationRepository;

