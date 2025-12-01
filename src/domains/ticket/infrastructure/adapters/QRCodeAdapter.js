/**
 * QR Code Adapter
 * Infrastructure layer - external service adapter
 */

const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

class QRCodeAdapter {
  constructor() {
    this.jwtSecret = process.env.QR_TOKEN_SECRET || 'supersecretkey';
    this.appUrl = process.env.ADMIN_ORIGIN || process.env.APP_URL || 'https://api.jaaiye.com';
  }

  /**
   * Generate QR code for a ticket
   * @param {Object} ticket - Ticket entity
   * @returns {Promise<{ qrCode: string, token: string, verifyUrl: string }>}
   */
  async generateTicketQRCode(ticket) {
    const payload = {
      ticketId: ticket.id || ticket._id,
      eventId: ticket.eventId,
      userId: ticket.userId,
      type: 'ticket',
    };

    // No short expiration since tickets can be used weeks later
    const token = jwt.sign(payload, this.jwtSecret);

    const verifyUrl = `${this.appUrl}/tickets/verify?token=${token}`;
    const qrCode = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    return { qrCode, token, verifyUrl };
  }

  /**
   * Verify QR token
   * @param {string} token
   * @returns {Promise<Object|null>} Decoded token payload or null if invalid
   */
  async verifyQRToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (err) {
      return null;
    }
  }
}

module.exports = QRCodeAdapter;

