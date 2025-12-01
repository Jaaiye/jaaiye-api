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
      throw new TicketAlreadyUsedError();
    }

    // Mark as used
    ticket.markAsUsed();
    await this.ticketRepository.update(ticket.id, {
      status: 'used',
      usedAt: ticket.usedAt
    });

    return {
      message: 'Ticket verified and marked as used',
      ticket: {
        id: ticket.id,
        status: ticket.status,
        usedAt: ticket.usedAt,
        event: ticket.eventId,
        user: ticket.userId
      }
    };
  }
}

module.exports = VerifyAndUseTicketUseCase;

