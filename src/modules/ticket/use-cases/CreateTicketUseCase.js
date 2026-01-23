/**
 * Create Ticket Use Case
 * Application layer - business logic
 */

const { InvalidTicketTypeError } = require('../errors');
const { ValidationError, NotFoundError } = require('../../common/errors');
const EventSchema = require('../../event/entities/Event.schema');

class CreateTicketUseCase {
  constructor({
    ticketRepository,
    eventRepository,
    userRepository,
    qrCodeAdapter,
    emailAdapter,
    eventParticipantRepository,
    calendarSyncService
  }) {
    this.ticketRepository = ticketRepository;
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.qrCodeAdapter = qrCodeAdapter;
    this.emailAdapter = emailAdapter;
    this.eventParticipantRepository = eventParticipantRepository;
    this.calendarSyncService = calendarSyncService;
  }

  async execute(dto) {
    console.log('[CreateTicketUseCase] Starting ticket creation', {
      eventId: dto.eventId,
      ticketTypeId: dto.ticketTypeId,
      quantity: dto.quantity,
      hasUserId: !!dto.userId,
      hasUsername: !!dto.username,
      hasEmail: !!dto.email,
      bypassCapacity: dto.bypassCapacity
    });

    dto.validate();

    const targetUserId = await this._resolveTargetUser(dto);
    const eventDoc = await this._getAndValidateEvent(dto.eventId);
    const { resolvedPrice, chosenType, ticketTypeIdForTracking, ticketTypeNameForTracking, ticketTypeIdForSales } =
      await this._determineTicketPricing(eventDoc, dto);

    const ticket = await this._createTicket({
      targetUserId,
      eventId: dto.eventId,
      ticketTypeIdForTracking,
      ticketTypeNameForTracking,
      resolvedPrice,
      quantity: dto.quantity
    });

    const updatedTicket = await this._generateAndSavePublicId(ticket);
    const finalTicket = await this._generateAndSaveQRCode(updatedTicket);

    await eventDoc.incrementTicketSales(ticketTypeIdForSales, dto.quantity, dto.bypassCapacity);
    await this._addParticipantAndSyncCalendar(targetUserId, dto.eventId);

    // Only send email if skipEmail is not set
    if (!dto.skipEmail) {
      await this._sendEmailNotification(targetUserId, finalTicket);
    }

    console.log('[CreateTicketUseCase] Ticket creation completed successfully', {
      ticketId: finalTicket.id,
      publicId: finalTicket.publicId,
      hasQrCode: !!finalTicket.qrCode,
      hasPublicId: !!finalTicket.publicId
    });

    return finalTicket;
  }

  async _resolveTargetUser(dto) {
    let targetUserId = dto.userId;

    if (!targetUserId && dto.username) {
      console.log('[CreateTicketUseCase] Looking up user by username', { username: dto.username });
      const user = await this.userRepository.findByUsername(dto.username);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      targetUserId = user.id;
    }

    if (!targetUserId && dto.email) {
      console.log('[CreateTicketUseCase] Looking up user by email', { email: dto.email });
      const user = await this.userRepository.findByEmail(dto.email);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new ValidationError('Target user is required');
    }

    console.log('[CreateTicketUseCase] Target user resolved', { targetUserId });
    return targetUserId;
  }

  async _getAndValidateEvent(eventId) {
    const eventDoc = await EventSchema.findById(eventId);
    if (!eventDoc) {
      throw new NotFoundError('Event not found');
    }

    // Allow ticket creation for scheduled and published events
    const validStatuses = ['scheduled', 'published'];
    if (!validStatuses.includes(eventDoc.status)) {
      throw new ValidationError(`Cannot create ticket for ${eventDoc.status} event. Event must be scheduled or published.`);
    }

    return eventDoc;
  }

  async _determineTicketPricing(eventDoc, dto) {
    let chosenType = null;
    let resolvedPrice = 0;

    if (eventDoc.ticketFee === 'free') {
      resolvedPrice = 0;
    } else if (Array.isArray(eventDoc.ticketTypes) && eventDoc.ticketTypes.length > 0) {
      chosenType = await this._selectTicketType(eventDoc, dto);
      resolvedPrice = Number(chosenType.price) || 0;

      if (chosenType.type === 'complimentary') {
        resolvedPrice = 0;
      }
    } else {
      if (eventDoc.ticketFee === null || eventDoc.ticketFee === undefined || eventDoc.ticketFee === 'free') {
        resolvedPrice = 0;
      } else if (isNaN(eventDoc.ticketFee)) {
        throw new ValidationError('Event is paid but no ticket types configured');
      } else {
        resolvedPrice = Number(eventDoc.ticketFee);
      }
    }

    return {
      resolvedPrice,
      chosenType,
      ticketTypeIdForTracking: chosenType?._id,
      ticketTypeNameForTracking: chosenType?.name || 'Standard',
      ticketTypeIdForSales: chosenType ? chosenType._id : null
    };
  }

  async _selectTicketType(eventDoc, dto) {
    if (dto.ticketTypeId) {
      const tt = eventDoc.ticketTypes.id(dto.ticketTypeId);
      if (!tt) {
        throw new NotFoundError('Ticket type not found');
      }

      const now = new Date();
      const inWindow = (!tt.salesStartDate || now >= tt.salesStartDate) &&
        (!tt.salesEndDate || now <= tt.salesEndDate);
      const hasCapacity = !tt.capacity || (tt.soldCount + dto.quantity) <= tt.capacity;

      if (!tt.isActive || !inWindow || (!hasCapacity && !dto.bypassCapacity)) {
        throw new InvalidTicketTypeError('Ticket type is not available for purchase');
      }
      return tt;
    }

    const available = eventDoc.getAvailableTicketTypes();
    const availableWithCapacity = available.filter(tt =>
      !tt.capacity || (tt.soldCount + dto.quantity) <= tt.capacity
    );

    const chosenType =
      availableWithCapacity.find(tt => /early\s*bird/i.test(tt.name)) ||
      availableWithCapacity.find(tt => /regular/i.test(tt.name)) ||
      availableWithCapacity[0];

    if (!chosenType) {
      throw new InvalidTicketTypeError('No available ticket types');
    }

    return chosenType;
  }

  async _createTicket({ targetUserId, eventId, ticketTypeIdForTracking, ticketTypeNameForTracking, resolvedPrice, quantity }) {
    console.log('[CreateTicketUseCase] Creating ticket', {
      userId: targetUserId,
      eventId,
      ticketTypeId: ticketTypeIdForTracking,
      ticketTypeName: ticketTypeNameForTracking,
      price: resolvedPrice,
      quantity
    });

    const ticket = await this.ticketRepository.create({
      userId: targetUserId,
      eventId,
      ticketTypeId: ticketTypeIdForTracking,
      ticketTypeName: ticketTypeNameForTracking,
      price: resolvedPrice,
      quantity
    });

    console.log('[CreateTicketUseCase] Ticket created', {
      ticketId: ticket.id,
      publicId: ticket.publicId
    });

    return ticket;
  }

  async _generateAndSavePublicId(ticket) {
    if (ticket.publicId) {
      console.log('[CreateTicketUseCase] Ticket already has publicId', { publicId: ticket.publicId });
      return ticket;
    }

    console.log('[CreateTicketUseCase] Generating publicId');
    const publicId = await this._generateUniquePublicId();

    console.log('[CreateTicketUseCase] Updating ticket with publicId', {
      ticketId: ticket.id,
      publicId
    });

    const updatedTicket = await this.ticketRepository.update(ticket.id, { publicId });

    if (!updatedTicket || !updatedTicket.publicId) {
      throw new Error('Failed to save publicId to database');
    }

    console.log('[CreateTicketUseCase] publicId successfully saved', {
      ticketId: updatedTicket.id,
      publicId: updatedTicket.publicId
    });

    return updatedTicket;
  }

  async _generateUniquePublicId() {
    const MAX_ATTEMPTS = 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const publicId = `jaaiye-${randomNum}`;

      console.log('[CreateTicketUseCase] Checking publicId uniqueness', {
        publicId,
        attempt: attempt + 1
      });

      // Important: Don't populate when checking uniqueness - we only need to know if it exists
      const existing = await this.ticketRepository.findByPublicId(publicId);

      if (!existing) {
        console.log('[CreateTicketUseCase] Found unique publicId', { publicId });
        return publicId;
      }
    }

    throw new Error('Failed to generate unique ticket number after multiple attempts');
  }

  async _generateAndSaveQRCode(ticket) {
    console.log('[CreateTicketUseCase] Generating QR codes', {
      ticketId: ticket.id,
      publicId: ticket.publicId
    });

    const ticketForQR = this._prepareTicketForQR(ticket);

    const { qrCode } = await this.qrCodeAdapter.generateTicketQRCodeWithPublicId(ticketForQR);
    const { token, verifyUrl } = await this.qrCodeAdapter.generateTicketQRCode(ticketForQR);

    console.log('[CreateTicketUseCase] QR codes generated', {
      hasQrCode: !!qrCode,
      hasToken: !!token
    });

    const finalTicket = await this.ticketRepository.update(ticket.id, {
      qrCode,
      ticketData: JSON.stringify({ verifyUrl, token })
    });

    if (!finalTicket.qrCode) {
      throw new Error('Failed to save QR code to database');
    }

    console.log('[CreateTicketUseCase] Ticket updated with QR code', {
      ticketId: finalTicket.id,
      hasQrCode: !!finalTicket.qrCode
    });

    return finalTicket;
  }

  _prepareTicketForQR(ticket) {
    if (!ticket.userId) {
      throw new Error(`Ticket userId is missing. Ticket ID: ${ticket.id}`);
    }
    if (!ticket.publicId) {
      throw new Error(`Ticket publicId is missing. Ticket ID: ${ticket.id}`);
    }

    return {
      id: ticket.id?.toString ? ticket.id.toString() : ticket.id,
      _id: ticket._id || ticket.id,
      userId: ticket.userId?.toString ? ticket.userId.toString() : ticket.userId,
      eventId: ticket.eventId?.toString ? ticket.eventId.toString() : ticket.eventId,
      publicId: ticket.publicId,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketTypeName,
      price: ticket.price,
      quantity: ticket.quantity,
      status: ticket.status
    };
  }

  async _addParticipantAndSyncCalendar(targetUserId, eventId) {
    if (!this.eventParticipantRepository || !this.calendarSyncService) {
      return;
    }

    setImmediate(async () => {
      try {
        const targetUser = await this.userRepository.findById(targetUserId);
        if (!targetUser) return;

        const existingParticipant = await this.eventParticipantRepository.findByEventAndUser(
          eventId,
          targetUserId
        );

        if (!existingParticipant) {
          await this.eventParticipantRepository.create({
            event: eventId,
            user: targetUserId,
            role: 'attendee',
            status: 'accepted'
          });

          const event = await this.eventRepository.findById(eventId);
          if (event) {
            await this.calendarSyncService.syncEventToUserCalendars(targetUserId, event, {
              skipGoogle: false
            });
          }
        }
      } catch (error) {
        console.warn('[CreateTicket] Failed to add participant or sync calendar:', error);
      }
    });
  }

  async _sendEmailNotification(targetUserId, ticket) {
    try {
      console.log('[CreateTicketUseCase] Preparing email notification', { targetUserId, ticketId: ticket.id });

      const targetUser = await this.userRepository.findById(targetUserId);
      if (!targetUser || !targetUser.email) {
        console.warn('[CreateTicketUseCase] Cannot send email - no target user or email');
        return;
      }

      const TicketSchema = require('../entities/Ticket.schema');
      const populatedDoc = await TicketSchema.findById(ticket.id)
        .select('+qrCode +publicId')
        .populate('eventId', 'title startTime endTime venue image ticketTypes')
        .populate('userId', 'username fullName email')
        .lean();

      const ticketForEmail = await this._prepareTicketForEmail(populatedDoc, ticket, targetUser);

      await this.emailAdapter.sendPaymentConfirmationEmail(targetUser, ticketForEmail);
      console.log('[CreateTicketUseCase] Email sent successfully');
    } catch (error) {
      console.error('[CreateTicketUseCase] Failed to send email notification:', {
        error: error.message,
        targetUserId,
        ticketId: ticket.id
      });
    }
  }

  async _prepareTicketForEmail(populatedDoc, ticket, targetUser) {
    if (populatedDoc && populatedDoc.eventId && typeof populatedDoc.eventId === 'object') {
      const populatedUserId = (populatedDoc.userId && typeof populatedDoc.userId === 'object' && populatedDoc.userId.id)
        ? populatedDoc.userId
        : {
          id: targetUser.id,
          username: targetUser.username || '',
          fullName: targetUser.fullName || '',
          email: targetUser.email || ''
        };

      return {
        ...populatedDoc,
        id: populatedDoc._id?.toString() || populatedDoc.id,
        eventId: populatedDoc.eventId,
        userId: populatedUserId,
        qrCode: ticket.qrCode,
        ticketData: ticket.ticketData,
        publicId: ticket.publicId,
        price: ticket.price,
        quantity: ticket.quantity,
        ticketTypeName: ticket.ticketTypeName,
        status: ticket.status
      };
    }

    const event = await this.eventRepository.findById(ticket.eventId);
    if (!event) {
      throw new Error('Event not found for email notification');
    }

    return {
      id: ticket.id,
      eventId: {
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        image: event.image,
        ticketTypes: event.ticketTypes
      },
      userId: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
        email: targetUser.email
      },
      qrCode: ticket.qrCode,
      ticketData: ticket.ticketData,
      publicId: ticket.publicId,
      price: ticket.price,
      quantity: ticket.quantity,
      ticketTypeName: ticket.ticketTypeName,
      status: ticket.status
    };
  }
}

module.exports = CreateTicketUseCase;