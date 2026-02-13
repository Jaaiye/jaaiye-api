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
      admissionSize:data.admissionSize,
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
    const ticketId = id?.toString ? id.toString() : id;

    console.log('[TicketRepository] Updating ticket', {
      ticketId,
      ticketIdType: typeof ticketId,
      updates,
      updateKeys: Object.keys(updates || {})
    });

    const ticket = await TicketSchema.findByIdAndUpdate(
      ticketId,
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );

    console.log('[TicketRepository] Ticket updated', {
      found: !!ticket,
      ticketId: ticket?._id?.toString() || ticket?.id,
      publicId: ticket?.publicId,
      hasQrCode: !!ticket?.qrCode
    });

    if (!ticket) {
      throw new Error(`Ticket not found with ID: ${ticketId}`);
    }

    return this._toEntity(ticket);
  }

  async countByEventAndType(eventId, ticketTypeId) {
    return TicketSchema.countDocuments({ eventId, ticketTypeId });
  }

  /**
   * Find ticket by publicId
   * Note: This method should NOT populate by default to avoid errors during uniqueness checks
   * Only populate when explicitly requested via options
   */
  async findByPublicId(publicId, options = {}) {
    // Start with a simple query - no population by default
    let query = TicketSchema.findOne({ publicId });

    // Only populate if explicitly requested
    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(pop => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }

      // Use .lean() when populating to get plain objects
      const ticket = await query.lean();

      // Handle case where userId population fails
      if (ticket && (!ticket.userId || ticket.userId === null)) {
        const rawTicket = await TicketSchema.findOne({ publicId }).select('userId').lean();

        if (rawTicket && rawTicket.userId) {
          const UserSchema = require('../../common/entities/User.schema');
          const user = await UserSchema.findById(rawTicket.userId)
            .select('fullName email username')
            .lean();

          if (user) {
            ticket.userId = user;
          }
        }
      }

      return this._toEntity(ticket);
    }

    // For simple existence checks (like uniqueness validation), don't populate
    const ticket = await query;
    return this._toEntity(ticket);
  }
}

module.exports = TicketRepository;