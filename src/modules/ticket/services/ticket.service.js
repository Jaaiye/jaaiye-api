// QR code generation moved to QRCodeAdapter in Ticket domain
// For legacy compatibility, using QRCode directly
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.QR_TOKEN_SECRET || 'supersecretkey';
const APP_URL = process.env.ADMIN_ORIGIN || 'https://api.jaaiye.com';

async function generateTicketQRCode(ticket) {
  const payload = {
    ticketId: ticket._id,
    eventId: ticket.eventId,
    userId: ticket.userId,
    type: 'ticket',
  };
  const token = jwt.sign(payload, JWT_SECRET);
  const verifyUrl = `${APP_URL}/tickets/verify?token=${token}`;
  const qrCode = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  return { qrCode, token, verifyUrl };
}
const Ticket = require('../modules/Ticket');
const Event = require('../modules/Event');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

async function createTicketInternal({ eventId, ticketTypeId = null, quantity = 1, userId, assignedTo = null, bypassCapacity = false }) {
  if (!eventId) {
    throw new ValidationError('Event ID is required');
  }

  if (quantity < 1 || quantity > 10) {
    throw new ValidationError('Quantity must be between 1 and 10');
  }

  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event not found');

  if (event.status !== 'scheduled') {
    throw new ValidationError('Cannot create ticket for cancelled or completed event');
  }

  // Determine ticket pricing mode (free vs paid with types)
  let chosenType = null;
  let resolvedPrice = 0;

  if (event.ticketFee === 'free') {
    // Free mode: all tickets are free
    resolvedPrice = 0;
  } else if (Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0) {
    // Paid mode with ticket types
    if (ticketTypeId) {
      const tt = event.ticketTypes.id(ticketTypeId);
      if (!tt) throw new NotFoundError('Ticket type not found');

      // Validate availability
      const now = new Date();
      const inWindow = (!tt.salesStartDate || now >= tt.salesStartDate) && (!tt.salesEndDate || now <= tt.salesEndDate);
      const hasCapacity = !tt.capacity || (tt.soldCount + quantity) <= tt.capacity;
      if (!tt.isActive || !inWindow || (!hasCapacity && !bypassCapacity)) {
        throw new ValidationError('Ticket type is not available for purchase');
      }
      chosenType = tt;
    } else {
      // Auto-pick: Early Bird priority (by name), else Regular, else first available
      const available = event.getAvailableTicketTypes();
      const availableWithCapacity = available.filter(tt => !tt.capacity || (tt.soldCount + quantity) <= tt.capacity);
      chosenType =
        availableWithCapacity.find(tt => /early\s*bird/i.test(tt.name)) ||
        availableWithCapacity.find(tt => /regular/i.test(tt.name)) ||
        availableWithCapacity[0];
      if (!chosenType) {
        throw new ValidationError('No available ticket types');
      }
    }
      resolvedPrice = Number(chosenType.price) || 0;

      // Check if this is a complimentary ticket type (price should already be 0, but ensure it)
      if (chosenType.type === 'complimentary') {
        resolvedPrice = 0;
      }
  } else {
    // Paid without configured types: fallback to legacy ticketFee numeric
    if (event.ticketFee === null || event.ticketFee === undefined || event.ticketFee === 'free') {
      resolvedPrice = 0;
    } else if (isNaN(event.ticketFee)) {
      throw new ValidationError('Event is paid but no ticket types configured');
    } else {
      resolvedPrice = Number(event.ticketFee);
    }
  }

  // Avoid duplicate tickets per user for same event type
  // const existingTicket = await Ticket.findOne({ userId, eventId });
  // if (existingTicket && !assignedTo) {
  //   throw new ConflictError('You already have a ticket for this event');
  // }

  const ticketTypeIdForTracking = chosenType?._id;
  const ticketTypeNameForTracking = chosenType?.name || 'Standard';
  const ticketTypeIdForSales = chosenType ? chosenType._id : null;

  const ticket = await Ticket.create({
    userId,
    eventId,
    ticketTypeId: ticketTypeIdForTracking,
    ticketTypeName: ticketTypeNameForTracking,
    price: resolvedPrice,
    quantity,
    assignedTo
  });

  // Ensure a human-readable publicId (e.g., jaaiye-XXXXXX)
  if (!ticket.publicId) {
    const suffix = (ticket._id?.toString?.() || Math.random().toString(36).slice(2)).slice(-8);
    ticket.publicId = `jaaiye-${suffix}`;
  }

  const { qrCode, verifyUrl } = await generateTicketQRCode(ticket);
  ticket.qrCode = qrCode;
  ticket.ticketData = JSON.stringify({ verifyUrl });
  await ticket.save();

  // Increment event’s sold ticket count (and specific type if selected)
  await event.incrementTicketSales(ticketTypeIdForSales, quantity, bypassCapacity);

  await ticket.populate([
    { path: 'eventId', select: 'title startTime endTime venue image ticketTypes' },
    { path: 'userId', select: 'username fullName email' }
  ]);

  return ticket;
}

async function verifyAndUseTicket(ticketId, scannerUser = null) {
  const ticket = await Ticket.findById(ticketId).populate('event user');
  if (!ticket) throw new Error('Ticket not found');

  // If scanner is authenticated
  if (scannerUser) {
    if (ticket.status === 'used') throw new Error('Ticket already used');

    ticket.status = 'used';
    ticket.usedAt = new Date();
    ticket.usedBy = scannerUser._id;
    await ticket.save();

    return {
      message: 'Ticket verified and marked as used',
      data: ticket
    };
  }

  // Non-authenticated (public check)
  return {
    message: 'Ticket valid',
    data: {
      eventName: ticket.eventId.name,
      holderName: ticket.userId.name,
      status: ticket.status
    }
  };
}

module.exports = {
  createTicketInternal,
  verifyAndUseTicket
};
