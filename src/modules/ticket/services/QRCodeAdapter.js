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
   * Generate QR code for a ticket using publicId (new format)
   * QR code contains just the publicId: "jaaiye-123456"
   * @param {Object} ticket - Ticket entity
   * @returns {Promise<{ qrCode: string }>}
   */
  async generateTicketQRCodeWithPublicId(ticket) {
    if (!ticket.publicId) {
      throw new Error('Ticket publicId is required to generate QR code');
    }

    // QR code contains just the publicId
    const qrCode = await QRCode.toDataURL(ticket.publicId, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    return { qrCode };
  }

  /**
   * Generate QR code for a ticket using token (legacy format, for backward compatibility)
   * QR code contains URL with token: "https://api.jaaiye.com/tickets/verify?token=..."
   * @param {Object} ticket - Ticket entity
   * @returns {Promise<{ qrCode: string, token: string, verifyUrl: string }>}
   */
  async generateTicketQRCode(ticket) {
    if (!ticket) {
      throw new Error('Ticket is required to generate QR code');
    }

    console.log('[QRCodeAdapter] Generating QR code', {
      ticketId: ticket.id || ticket._id,
      ticketUserId: ticket.userId,
      ticketEventId: ticket.eventId,
      userIdType: typeof ticket.userId
    });

    // Ensure userId is available - convert ObjectId to string if needed
    const userId = ticket.userId?.toString ? ticket.userId.toString() : (ticket.userId || null);
    const eventId = ticket.eventId?.toString ? ticket.eventId.toString() : (ticket.eventId || null);
    const ticketId = ticket.id?.toString ? ticket.id.toString() : (ticket._id?.toString ? ticket._id.toString() : ticket.id || ticket._id);

    if (!userId) {
      throw new Error('Ticket userId is required to generate QR code');
    }

    const payload = {
      ticketId,
      eventId,
      userId,
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

