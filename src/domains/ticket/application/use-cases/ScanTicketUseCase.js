/**
 * Scan Ticket Use Case (Public View)
 * Application layer - business logic
 */

const { TicketNotFoundError } = require('../../domain/errors');

class ScanTicketUseCase {
  constructor({ ticketRepository, qrCodeAdapter }) {
    this.ticketRepository = ticketRepository;
    this.qrCodeAdapter = qrCodeAdapter;
  }

  async execute(token) {
    const decoded = await this.qrCodeAdapter.verifyQRToken(token);
    console.log("decoded: ", decoded)

    if (!decoded || !decoded.ticketId) {
      throw new TicketNotFoundError('Invalid or expired ticket');
    }

    const ticketId = decoded.ticketId;
    const ticket = await this.ticketRepository.findById(ticketId, {
      populate: 'eventId'
    });
    console.log("ticket: ", ticket)

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    return {
      success: true,
      ticket: {
        id: ticket.id,
        status: ticket.status,
        event: ticket.eventId
      }
    };
  }
}

module.exports = ScanTicketUseCase;

