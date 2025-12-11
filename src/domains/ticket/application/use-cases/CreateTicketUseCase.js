/**
 * Create Ticket Use Case
 * Application layer - business logic
 */

const { CreateTicketDTO } = require('../dto');
const { TicketNotFoundError, InvalidTicketTypeError } = require('../../domain/errors');
const { ValidationError, NotFoundError } = require('../../../shared/domain/errors');
const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');

class CreateTicketUseCase {
  constructor({
    ticketRepository,
    eventRepository,
    userRepository,
    qrCodeAdapter,
    emailAdapter
  }) {
    this.ticketRepository = ticketRepository;
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.qrCodeAdapter = qrCodeAdapter;
    this.emailAdapter = emailAdapter;
  }

  async execute(dto) {
    dto.validate();

    // Resolve target user
    let targetUserId = dto.userId;
    if (!targetUserId && dto.username) {
      const user = await this.userRepository.findByUsername(dto.username);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new ValidationError('Target user is required');
    }

    // Get event (as Mongoose document for schema methods)
    const eventDoc = await EventSchema.findById(dto.eventId);
    if (!eventDoc) {
      throw new NotFoundError('Event not found');
    }

    if (eventDoc.status !== 'scheduled') {
      throw new ValidationError('Cannot create ticket for cancelled or completed event');
    }

    // Determine ticket pricing mode (free vs paid with types)
    let chosenType = null;
    let resolvedPrice = 0;

    if (eventDoc.ticketFee === 'free') {
      // Free mode: all tickets are free
      resolvedPrice = 0;
    } else if (Array.isArray(eventDoc.ticketTypes) && eventDoc.ticketTypes.length > 0) {
      // Paid mode with ticket types
      if (dto.ticketTypeId) {
        const tt = eventDoc.ticketTypes.id(dto.ticketTypeId);
        if (!tt) {
          throw new NotFoundError('Ticket type not found');
        }

        // Validate availability
        const now = new Date();
        const inWindow = (!tt.salesStartDate || now >= tt.salesStartDate) &&
                        (!tt.salesEndDate || now <= tt.salesEndDate);
        const hasCapacity = !tt.capacity || (tt.soldCount + dto.quantity) <= tt.capacity;

        if (!tt.isActive || !inWindow || (!hasCapacity && !dto.bypassCapacity)) {
          throw new InvalidTicketTypeError('Ticket type is not available for purchase');
        }
        chosenType = tt;
      } else {
        // Auto-pick: Early Bird priority (by name), else Regular, else first available
        const available = eventDoc.getAvailableTicketTypes();
        const availableWithCapacity = available.filter(tt =>
          !tt.capacity || (tt.soldCount + dto.quantity) <= tt.capacity
        );
        chosenType =
          availableWithCapacity.find(tt => /early\s*bird/i.test(tt.name)) ||
          availableWithCapacity.find(tt => /regular/i.test(tt.name)) ||
          availableWithCapacity[0];
        if (!chosenType) {
          throw new InvalidTicketTypeError('No available ticket types');
        }
      }
      resolvedPrice = Number(chosenType.price) || 0;
    } else {
      // Paid without configured types: fallback to legacy ticketFee numeric
      if (eventDoc.ticketFee === null || eventDoc.ticketFee === undefined || eventDoc.ticketFee === 'free') {
        resolvedPrice = 0;
      } else if (isNaN(eventDoc.ticketFee)) {
        throw new ValidationError('Event is paid but no ticket types configured');
      } else {
        resolvedPrice = Number(eventDoc.ticketFee);
      }
    }

    // Complimentary overrides price
    if (dto.complimentary) {
      resolvedPrice = 0;
    }

    const ticketTypeIdForTracking = dto.complimentary ? undefined : chosenType?._id;
    const ticketTypeNameForTracking = dto.complimentary ? 'Complimentary' : chosenType?.name;
    const ticketTypeIdForSales = dto.complimentary ? null : (chosenType ? chosenType._id : null);

    // Create ticket
    const ticket = await this.ticketRepository.create({
      userId: targetUserId,
      eventId: dto.eventId,
      ticketTypeId: ticketTypeIdForTracking,
      ticketTypeName: ticketTypeNameForTracking,
      price: resolvedPrice,
      quantity: dto.quantity
    });

    // Ensure a human-readable publicId
    if (!ticket.publicId) {
      const suffix = (ticket.id?.toString() || Math.random().toString(36).slice(2)).slice(-8);
      await this.ticketRepository.update(ticket.id, { publicId: `jaaiye-${suffix}` });
      ticket.publicId = `jaaiye-${suffix}`;
    }

    // Generate QR code
    const { qrCode, verifyUrl } = await this.qrCodeAdapter.generateTicketQRCode(ticket);
    await this.ticketRepository.update(ticket.id, {
      qrCode,
      ticketData: JSON.stringify({ verifyUrl })
    });
    ticket.qrCode = qrCode;
    ticket.ticketData = JSON.stringify({ verifyUrl });

    // Increment event's sold ticket count
    await eventDoc.incrementTicketSales(ticketTypeIdForSales, dto.quantity, dto.bypassCapacity);

    // Send email notification (non-blocking)
    try {
      const targetUser = await this.userRepository.findById(targetUserId);
      console.log('[CreateTicket] Target user for email:', {
        userId: targetUserId,
        hasUser: !!targetUser,
        hasEmail: !!targetUser?.email,
        email: targetUser?.email
      });

      if (targetUser && targetUser.email) {
        // Get populated ticket for email - use raw Mongoose document to preserve populated fields
        const TicketSchema = require('../../infrastructure/persistence/schemas/Ticket.schema');
        const populatedDoc = await TicketSchema.findById(ticket.id)
          .populate('eventId', 'title startTime endTime venue image ticketTypes')
          .populate('userId', 'username fullName email')
          .lean();

        console.log('[CreateTicket] Populated ticket doc:', {
          hasDoc: !!populatedDoc,
          hasEventId: !!populatedDoc?.eventId,
          eventIdType: typeof populatedDoc?.eventId,
          eventIdIsObject: populatedDoc?.eventId && typeof populatedDoc.eventId === 'object',
          hasEventTitle: !!populatedDoc?.eventId?.title,
          hasQrCode: !!ticket.qrCode
        });

        if (populatedDoc && populatedDoc.eventId) {
          // Convert to plain object with populated fields preserved
          const ticketForEmail = {
            ...populatedDoc,
            id: populatedDoc._id?.toString() || populatedDoc.id,
            eventId: populatedDoc.eventId, // This will be the populated event object
            userId: populatedDoc.userId,   // This will be the populated user object
            qrCode: ticket.qrCode,
            ticketData: ticket.ticketData,
            publicId: ticket.publicId,
            price: ticket.price,
            quantity: ticket.quantity,
            ticketTypeName: ticket.ticketTypeName,
            status: ticket.status
          };

          console.log('[CreateTicket] Sending email to:', targetUser.email);
          await this.emailAdapter.sendPaymentConfirmationEmail(targetUser, ticketForEmail);
          console.log('[CreateTicket] Email sent successfully');
        } else {
          console.warn('[CreateTicket] Cannot send email - missing populated ticket or event data');
        }
      } else {
        console.warn('[CreateTicket] Cannot send email - user not found or no email address');
      }
    } catch (error) {
      console.error('[CreateTicket] Failed to send ticket email:', error);
      console.error('[CreateTicket] Email error stack:', error.stack);
      // Don't fail ticket creation if email fails
    }

    return ticket;
  }
}

module.exports = CreateTicketUseCase;

