/**
 * Ticket Repository Implementation
 * Infrastructure layer - Mongoose implementation
 */

const { TicketEntity } = require('../../../domain/entities');
const { ITicketRepository } = require('../../../domain/repositories');
const TicketSchema = require('../schemas/Ticket.schema');

class TicketRepository extends ITicketRepository {
  /**
   * Convert Mongoose document to TicketEntity
   * @private
   */
  _toEntity(doc) {
    if (!doc) return null;
    if (doc instanceof TicketEntity) return doc;

    const data = doc.toObject ? doc.toObject() : doc;
    return new TicketEntity({
      id: data._id || data.id,
      userId: data.userId,
      eventId: data.eventId,
      ticketTypeId: data.ticketTypeId,
      ticketTypeName: data.ticketTypeName,
      price: data.price,
      quantity: data.quantity,
      qrCode: data.qrCode,
      ticketData: data.ticketData,
      publicId: data.publicId,
      status: data.status,
      usedAt: data.usedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
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
}

module.exports = TicketRepository;

