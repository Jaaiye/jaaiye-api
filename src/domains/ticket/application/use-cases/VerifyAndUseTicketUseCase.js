/**
 * Verify And Use Ticket Use Case (Authenticated Scanner)
 * Application layer - business logic
 */

const { TicketNotFoundError, TicketAlreadyUsedError } = require('../../domain/errors');

class VerifyAndUseTicketUseCase {
  constructor({ ticketRepository, qrCodeAdapter }) {
    this.ticketRepository = ticketRepository;
    this.qrCodeAdapter = qrCodeAdapter;
  }

  async execute(token, scannerUserId) {
    const decoded = await this.qrCodeAdapter.verifyQRToken(token);

    if (!decoded || !decoded.ticketId) {
      throw new TicketNotFoundError('Invalid or expired ticket');
    }

    const ticketId = decoded.ticketId;
    const ticket = await this.ticketRepository.findById(ticketId, {
      populate: [
        { path: 'eventId', select: 'title startTime endTime venue' },
        { path: 'userId', select: 'fullName email username' }
      ]
    });

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    if (ticket.isUsed()) {
      // Get ticket with verifiedBy populated to show who verified it
      const usedTicket = await this.ticketRepository.findById(ticket.id, {
        populate: [
          { path: 'eventId', select: 'title startTime endTime venue' },
          { path: 'userId', select: 'fullName email username' },
          { path: 'verifiedBy', select: 'fullName email username' }
        ]
      });
      throw new TicketAlreadyUsedError({
        ticket: {
          id: usedTicket.id,
          publicId: usedTicket.publicId,
          status: usedTicket.status,
          usedAt: usedTicket.usedAt,
          verifiedBy: usedTicket.verifiedBy,
          event: usedTicket.eventId,
          user: usedTicket.userId
        }
      });
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
        { path: 'eventId', select: 'title startTime endTime venue' },
        { path: 'userId', select: 'fullName email username' },
        { path: 'verifiedBy', select: 'fullName email username' }
      ]
    });

    return {
      message: 'Ticket verified and marked as used',
      ticket: {
        id: updatedTicket.id,
        publicId: updatedTicket.publicId,
        status: updatedTicket.status,
        usedAt: updatedTicket.usedAt,
        verifiedBy: updatedTicket.verifiedBy,
        event: updatedTicket.eventId,
        user: updatedTicket.userId
      }
    };
  }
}

module.exports = VerifyAndUseTicketUseCase;

