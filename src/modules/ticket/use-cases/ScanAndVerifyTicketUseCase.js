/**
 * Scan And Verify Ticket Use Case (Unified)
 * Application layer - business logic
 * Handles both token and publicId scanning with verification
 */

const { TicketNotFoundError, TicketAlreadyUsedError } = require('../errors');

class ScanAndVerifyTicketUseCase {
  constructor({ ticketRepository, eventRepository, qrCodeAdapter }) {
    this.ticketRepository = ticketRepository;
    this.eventRepository = eventRepository;
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
      quantity: ticket.quantity,
      checkedInCount: ticket.checkedInCount,
      ticketTypeName: ticket.ticketTypeName,
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

  async execute(identifier, scannerUserId, eventId = null, checkInCount = 1) {
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

        // Resolve requested eventId (could be slug)
        const event = await this.eventRepository.findByIdOrSlug(eventId);
        if (!event) {
          throw new TicketNotFoundError('Event not found');
        }

        const requestedEventId = event.id.toString();
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

    // Check if ticket is already fully used
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
        message: 'Ticket already fully used',
        status: 'used',
        ticket: this._formatTicketResponse(usedTicket)
      };
    }

    // Validate check-in count
    const requestedCount = parseInt(checkInCount) || 1;
    const remainingAdmissions = ticket.quantity - (ticket.checkedInCount || 0);

    if (requestedCount > remainingAdmissions) {
      return {
        success: false,
        message: `Cannot check in ${requestedCount} people. Only ${remainingAdmissions} admissions remaining.`,
        status: 'limit_exceeded',
        ticket: this._formatTicketResponse(ticket)
      };
    }

    // Mark as checked in with scanner info
    await this.ticketRepository.update(ticket.id, {
      checkedInCount: (ticket.checkedInCount || 0) + requestedCount,
      verifiedBy: scannerUserId
    });

    // Check if now fully used
    const newCheckedInCount = (ticket.checkedInCount || 0) + requestedCount;
    if (newCheckedInCount >= ticket.quantity) {
      await this.ticketRepository.update(ticket.id, {
        status: 'used',
        usedAt: new Date()
      });
    }

    // Get updated ticket with verifiedBy populated
    const updatedTicket = await this.ticketRepository.findById(ticket.id, {
      populate: [
        { path: 'eventId', select: 'title' },
        { path: 'userId', select: 'fullName username' },
        { path: 'verifiedBy', select: 'fullName username' }
      ]
    });

    const isFullyUsed = updatedTicket.status === 'used';

    return {
      success: true,
      message: isFullyUsed
        ? `Ticket fully verified (${updatedTicket.quantity}/${updatedTicket.quantity})`
        : `Verified ${requestedCount} people. (${updatedTicket.checkedInCount}/${updatedTicket.quantity} checked in)`,
      status: isFullyUsed ? 'verified' : 'partial',
      ticket: this._formatTicketResponse(updatedTicket)
    };
  }
}

module.exports = ScanAndVerifyTicketUseCase;

