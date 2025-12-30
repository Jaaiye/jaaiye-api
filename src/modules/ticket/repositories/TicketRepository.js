/**
 * Ticket Repository Implementation
 * Infrastructure layer - Mongoose implementation
 */

const { TicketEntity } = require('../entities');
const { ITicketRepository } = require('./interfaces');
const TicketSchema = require('../entities/Ticket.schema');

class TicketRepository extends ITicketRepository {
  /**
   * Convert Mongoose document to TicketEntity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;
    if (doc instanceof TicketEntity) return doc;

    const data = doc.toObject ? doc.toObject() : doc;

    // Helper to check if a field is populated
    // With .lean(), populated fields are plain objects with _id and other properties
    // Unpopulated fields are ObjectId instances or strings
    const isPopulated = (field) => {
      if (!field || typeof field !== 'object') return false;
      // Check if it's an ObjectId instance (not populated)
      if (field.constructor && field.constructor.name === 'ObjectId') return false;
      // If it's a plain object with _id, it's likely populated
      // Also check for common populated field properties
      const hasId = field._id !== undefined;
      const hasUserProps = field.fullName !== undefined || field.email !== undefined || field.username !== undefined;
      const hasEventProps = field.title !== undefined || field.startTime !== undefined || field.venue !== undefined;
      // If it has _id and at least one other property, it's populated
      return hasId && (hasUserProps || hasEventProps || Object.keys(field).length > 1);
    };

    // With .lean(), populated fields are plain objects with _id and other properties
    // Unpopulated fields are ObjectId instances (which are also objects)
    // Just preserve all fields as-is - the entity will handle them correctly
    const userId = data.userId;
    const eventId = data.eventId;
    const verifiedBy = data.verifiedBy;


    const entity = new TicketEntity({
      id: data._id || data.id,
      userId: userId,
      eventId: eventId,
      ticketTypeId: data.ticketTypeId,
      ticketTypeName: data.ticketTypeName,
      price: data.price,
      quantity: data.quantity,
      qrCode: data.qrCode,
      ticketData: data.ticketData,
      publicId: data.publicId,
      status: data.status,
      usedAt: data.usedAt,
      verifiedBy: verifiedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });

    return entity;
  }

  /**
   * Convert array of Mongoose documents to TicketEntity array
   * @private
   */
  _toEntityArray(docs) {
    return docs.map(doc => this._toEntity(doc));
  }

  async create(ticketData) {
    const ticket = await TicketSchema.create(ticketData);
    return this._toEntity(ticket);
  }

  async findById(id, options = {}) {
    let query = TicketSchema.findById(id);

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        query = query.populate(options.populate);
      } else {
        query = query.populate(options.populate);
      }
    }

    const ticket = await query;
    return this._toEntity(ticket);
  }

  async findByUser(userId, options = {}) {
    let query = TicketSchema.findByUser(userId);

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        query = query.populate(options.populate);
      } else {
        query = query.populate(options.populate);
      }
    }

    const tickets = await query;
    return this._toEntityArray(tickets);
  }

  async findByEvent(eventId, options = {}) {
    let query = TicketSchema.findByEvent(eventId);

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        query = query.populate(options.populate);
      } else {
        query = query.populate(options.populate);
      }
    }

    const tickets = await query;
    return this._toEntityArray(tickets);
  }

  async findActiveByUser(userId, options = {}) {
    let query = TicketSchema.findActiveByUser(userId);

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        query = query.populate(options.populate);
      } else {
        query = query.populate(options.populate);
      }
    }

    const tickets = await query;
    return this._toEntityArray(tickets);
  }

  async update(id, updates) {
    const ticket = await TicketSchema.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    return this._toEntity(ticket);
  }

  async countByEventAndType(eventId, ticketTypeId) {
    return TicketSchema.countDocuments({ eventId, ticketTypeId });
  }

  async findByPublicId(publicId, options = {}) {
    let query = TicketSchema.findOne({ publicId });

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(pop => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    // First, get the ticket without populate to check if userId exists
    const rawTicket = await TicketSchema.findOne({ publicId }).select('userId').lean();

    // Use .lean() to get plain objects, which preserves populated fields
    const ticket = await query.lean();

    // If populate returned null but the ticket has a userId, fetch the user separately
    if ((!ticket.userId || ticket.userId === null) && rawTicket && rawTicket.userId) {
      // Fetch the user separately
      const UserSchema = require('../../common/entities/User.schema');
      const user = await UserSchema.findById(rawTicket.userId).select('fullName email username').lean();
      if (user) {
        ticket.userId = user;
      }
    }

    return this._toEntity(ticket);
  }
}

module.exports = TicketRepository;

