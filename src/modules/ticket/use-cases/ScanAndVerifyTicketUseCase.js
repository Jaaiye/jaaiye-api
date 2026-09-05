/**
 * Scan And Verify Ticket Use Case (Unified)
 * Application layer - business logic
 * Handles both token and publicId scanning with verification
 */

const { TicketNotFoundError, TicketAlreadyUsedError, TicketAccessDeniedError } = require('../errors');
const { canUserCheckInTickets } = require('../../event/services/EventOwnershipService');

class ScanAndVerifyTicketUseCase {
  constructor({ ticketRepository, eventRepository, eventTeamRepository, qrCodeAdapter }) {
    this.ticketRepository = ticketRepository;
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
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
   * @param {number} effectiveAdmissionSize - The actual admission size from event data
   * @returns {Object} Formatted ticket response
   */
  _formatTicketResponse(ticket, effectiveAdmissionSize) {
    return {
      id: ticket.id,
      publicId: ticket.publicId,
      status: ticket.status,
      quantity: ticket.quantity,
      admissionSize: effectiveAdmissionSize || ticket.admissionSize || 1,
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

  async execute(identifier, scannerUserId, eventId = null, checkInCount = 1, scannerRole = null) {
    let ticket;

    // Detect if identifier is publicId or token
    if (this._isPublicIdFormat(identifier)) {
      // Handle publicId
      const normalizedPublicId = identifier.trim().toLowerCase();
      ticket = await this.ticketRepository.findByPublicId(normalizedPublicId, {
        populate: [
          { path: 'eventId' }, // Populate full event to get ticketTypes
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
          { path: 'eventId' }, // Populate full event to get ticketTypes
          { path: 'userId', select: 'fullName username' }
        ]
      });

      if (!ticket) {
        throw new TicketNotFoundError('Ticket not found');
      }
    }

    // Authorize: the previous implementation had no per-event authorization
    // at all - a user with the platform-wide 'scanner'/'admin'/'superadmin'
    // role (route-level gate) could check in tickets for ANY event, and a
    // team member added to an event with the per-event 'ticket_scanner'
    // role had no way to actually scan since that role never touched the
    // global user.role field the route gate checks. This closes both gaps:
    // admin/superadmin keep their platform-wide override, everyone else
    // must be the event creator or an accepted team member with the
    // checkInTickets permission for the ticket's own event.
    if (scannerRole !== 'admin' && scannerRole !== 'superadmin') {
      const ticketEventId = ticket.eventId?._id?.toString() || ticket.eventId?.toString() || ticket.eventId;
      const event = await this.eventRepository.findById(ticketEventId);

      if (!event) {
        throw new TicketNotFoundError('Event not found');
      }

      const isCreator = event.creatorId && String(event.creatorId) === String(scannerUserId);
      const teamMember = isCreator
        ? null
        : await this.eventTeamRepository.findByEventAndUser(event.id, scannerUserId);

      if (!canUserCheckInTickets({ eventEntity: event, userId: scannerUserId, teamMember })) {
        throw new TicketAccessDeniedError('You do not have permission to check in tickets for this event');
      }
    }

    // Get admission size from Event configuration
    let admissionSize = ticket.admissionSize || 1;
    if (ticket.eventId && Array.isArray(ticket.eventId.ticketTypes) && ticket.ticketTypeId) {
      const targetId = ticket.ticketTypeId.toString();
      const ticketTypeConfig = ticket.eventId.ticketTypes.find(tt =>
        (tt._id?.toString() || tt.id?.toString()) === targetId
      );
      if (ticketTypeConfig) {
        admissionSize = ticketTypeConfig.admissionSize || 1;
      }
    }

    // Check if ticket is already fully used
    if (ticket.isUsed()) {
      // Get ticket with verifiedBy populated
      const usedTicket = await this.ticketRepository.findById(ticket.id, {
        populate: [
          { path: 'eventId' },
          { path: 'userId', select: 'fullName username' },
          { path: 'verifiedBy', select: 'fullName username' }
        ]
      });

      return {
        success: false,
        message: 'Ticket already fully used',
        status: 'used',
        ticket: this._formatTicketResponse(usedTicket, admissionSize)
      };
    }

    // Validate check-in count
    const requestedCount = parseInt(checkInCount) || 1;
    const remainingAdmissions = admissionSize - (ticket.checkedInCount || 0);

    if (requestedCount > remainingAdmissions) {
      return {
        success: false,
        message: `Cannot check in ${requestedCount} people. Only ${remainingAdmissions} admissions remaining.`,
        status: 'limit_exceeded',
        ticket: this._formatTicketResponse(ticket, admissionSize)
      };
    }

    // Mark as checked in with scanner info
    const newCheckedInCount = (ticket.checkedInCount || 0) + requestedCount;
    const updateData = {
      checkedInCount: newCheckedInCount,
      verifiedBy: scannerUserId
    };

    // Check if now fully used
    if (newCheckedInCount >= admissionSize) {
      updateData.status = 'used';
      updateData.usedAt = new Date();
    }

    await this.ticketRepository.update(ticket.id, updateData);

    // Get updated ticket with verifiedBy populated
    const updatedTicket = await this.ticketRepository.findById(ticket.id, {
      populate: [
        { path: 'eventId' },
        { path: 'userId', select: 'fullName username' },
        { path: 'verifiedBy', select: 'fullName username' }
      ]
    });

    const isFullyUsed = updatedTicket.status === 'used';

    return {
      success: true,
      message: isFullyUsed
        ? `Ticket fully verified (${admissionSize}/${admissionSize})`
        : `Verified ${requestedCount} people. (${updatedTicket.checkedInCount}/${admissionSize} checked in)`,
      status: isFullyUsed ? 'verified' : 'partial',
      ticket: this._formatTicketResponse(updatedTicket, admissionSize)
    };
  }
}

module.exports = ScanAndVerifyTicketUseCase;

