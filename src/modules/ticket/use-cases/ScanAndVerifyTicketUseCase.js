/**
 * Scan And Verify Ticket Use Case (Unified)
 * Application layer - business logic
 * Handles both token and publicId scanning with verification
 */

const { TicketNotFoundError, TicketAlreadyUsedError } = require('../errors');

class ScanAndVerifyTicketUseCase {
  constructor({ ticketRepository, qrCodeAdapter }) {
    this.ticketRepository = ticketRepository;
    this.qrCodeAdapter = qrCodeAdapter;
  }

  /**
   * Check if input looks like a publicId (case-insensitive)
   * @param {string} input
   * @returns {boolean}
   */
  _isPublicIdFormat(input) {
    if (!input || typeof input !== 'string') return false;
    const trimmed = input.trim();
    // Case-insensitive check for jaaiye- prefix followed by alphanumeric characters
    return /^jaaiye-[\w-]+$/i.test(trimmed);
  }

  /**
   * Format ticket response with simplified event and user data
   * @param {Object} ticket - Ticket entity
   * @returns {Object} Formatted ticket response
   */
  _formatTicketResponse(ticket) {
    return {
      id: ticket.id,
      publicId: ticket.publicId,
      status: ticket.status,
      usedAt: ticket.usedAt || null,
      verifiedBy: ticket.verifiedBy ? {
        fullName: ticket.verifiedBy.fullName,
        username: ticket.verifiedBy.username
      } : null,
      event: ticket.eventId ? {
        title: ticket.eventId.title || ticket.eventId
      } : null,
      ticketOwner: ticket.userId ? {
        fullName: ticket.userId.fullName,
        username: ticket.userId.username
      } : null
    };
  }

  async execute(identifier, scannerUserId, eventId = null) {
    let ticket;

    // Detect if identifier is publicId or token
    if (this._isPublicIdFormat(identifier)) {
      // Handle publicId
      const normalizedPublicId = identifier.trim().toLowerCase();
      ticket = await this.ticketRepository.findByPublicId(normalizedPublicId, {
        populate: [
          { path: 'eventId', select: 'title' },
          { path: 'userId', select: 'fullName username' }
        ]
      });

      if (!ticket) {
        throw new TicketNotFoundError('Ticket not found');
      }

      // If eventId is provided, verify the ticket belongs to that event
      if (eventId) {
        const ticketEventId = ticket.eventId?._id?.toString() || ticket.eventId?.toString() || ticket.eventId;
        const requestedEventId = eventId.toString();
        if (ticketEventId !== requestedEventId) {
          throw new TicketNotFoundError('Ticket does not belong to this event');
        }
      }
    } else {
      // Handle JWT token
      const decoded = await this.qrCodeAdapter.verifyQRToken(identifier);

      if (!decoded || !decoded.ticketId) {
        throw new TicketNotFoundError('Invalid or expired ticket');
      }

      const ticketId = decoded.ticketId;
      ticket = await this.ticketRepository.findById(ticketId, {
        populate: [
          { path: 'eventId', select: 'title' },
          { path: 'userId', select: 'fullName username' }
        ]
      });

      if (!ticket) {
        throw new TicketNotFoundError('Ticket not found');
      }
    }

    // Check if ticket is already used
    if (ticket.isUsed()) {
      // Get ticket with verifiedBy populated
      const usedTicket = await this.ticketRepository.findById(ticket.id, {
        populate: [
          { path: 'eventId', select: 'title' },
          { path: 'userId', select: 'fullName username' },
          { path: 'verifiedBy', select: 'fullName username' }
        ]
      });

      return {
        success: false,
        message: 'Ticket already used',
        status: 'used',
        ticket: this._formatTicketResponse(usedTicket)
      };
    }

    // Mark as used with scanner info
    ticket.markAsUsed();
    await this.ticketRepository.update(ticket.id, {
      status: 'used',
      usedAt: ticket.usedAt,
      verifiedBy: scannerUserId
    });

    // Get updated ticket with verifiedBy populated
    const updatedTicket = await this.ticketRepository.findById(ticket.id, {
      populate: [
        { path: 'eventId', select: 'title' },
        { path: 'userId', select: 'fullName username' },
        { path: 'verifiedBy', select: 'fullName username' }
      ]
    });

    return {
      success: true,
      message: 'Ticket verified and marked as used',
      status: 'verified',
      ticket: this._formatTicketResponse(updatedTicket)
    };
  }
}

module.exports = ScanAndVerifyTicketUseCase;

