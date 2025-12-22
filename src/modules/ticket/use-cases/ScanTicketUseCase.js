/**
 * Scan Ticket Use Case (Public View)
 * Application layer - business logic
 */

const { TicketNotFoundError } = require('../errors');

class ScanTicketUseCase {
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

  async execute(token) {
    // First, try to verify as JWT token
    const decoded = await this.qrCodeAdapter.verifyQRToken(token);
    console.log("decoded: ", decoded);

    if (decoded && decoded.ticketId) {
      // Successfully decoded JWT token
      const ticketId = decoded.ticketId;
      const ticket = await this.ticketRepository.findById(ticketId, {
        populate: 'eventId'
      });
      console.log("ticket: ", ticket);

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

    // If JWT verification failed, check if it's a publicId format
    if (this._isPublicIdFormat(token)) {
      // Normalize to lowercase for lookup (publicIds are stored in lowercase)
      const normalizedPublicId = token.trim().toLowerCase();
      const ticket = await this.ticketRepository.findByPublicId(normalizedPublicId, {
        populate: 'eventId'
      });
      console.log("ticket by publicId: ", ticket);

      if (!ticket) {
        throw new TicketNotFoundError('Invalid or expired ticket');
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

    // Neither JWT token nor publicId format
    throw new TicketNotFoundError('Invalid or expired ticket');
  }
}

module.exports = ScanTicketUseCase;

