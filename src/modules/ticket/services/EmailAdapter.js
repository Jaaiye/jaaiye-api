/**
 * Ticket Email Adapter
 * Infrastructure layer - email service adapter for tickets
 */

const { Resend } = require('resend');
const templates = require('../../../emails/templates');

class EmailAdapter {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@jaaiye.com';
  }

  /**
   * Send payment confirmation email with ticket details
   * @param {Object} user - User object with email, fullName, username
   * @param {Object|Array} ticketOrTickets - Single ticket or array of tickets
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async sendPaymentConfirmationEmail(user, ticketOrTickets, options = {}) {
    try {
      const email = typeof user === 'object' ? user.email : user;

      if (!email) {
        throw new Error('Email is required. User object must have an email property or provide email string directly.');
      }

      const tickets = Array.isArray(ticketOrTickets) ? ticketOrTickets : [ticketOrTickets];

      if (!tickets || tickets.length === 0) {
        throw new Error('At least one ticket is required to send confirmation email.');
      }

      // Validate ticket structure
      const firstTicket = tickets[0];
      if (!firstTicket.eventId) {
        throw new Error(`Ticket missing event information. Ticket ID: ${firstTicket.id || firstTicket._id || 'unknown'}. Event ID field is required.`);
      }

      // Check if eventId is populated (object with title) or just an ID
      if (typeof firstTicket.eventId === 'string' || (firstTicket.eventId && !firstTicket.eventId.title)) {
        throw new Error(`Ticket eventId is not populated. Expected event object with 'title' property, but got: ${typeof firstTicket.eventId}. Please populate the ticket with event data before sending email.`);
      }

      const ticketCount = tickets.length;
      const eventTitle = firstTicket.eventId?.title || 'Event';

      // Validate all tickets have required data
      const invalidTickets = tickets.filter(t => !t.eventId || typeof t.eventId !== 'object' || !t.eventId.title);
      if (invalidTickets.length > 0) {
        throw new Error(`${invalidTickets.length} ticket(s) missing valid event data. All tickets must have populated eventId with title property.`);
      }

      console.log('Generating email template', {
        email,
        ticketCount,
        eventTitle,
        hasQrCodes: tickets.filter(t => t.qrCode).length
      });

      const html = templates.paymentConfirmationEmail({ tickets });

      const subject = ticketCount > 1
        ? `🎟️ Payment Confirmed! Your ${ticketCount} Tickets for ${eventTitle}`
        : `🎟️ Payment Confirmed! Your Ticket for ${eventTitle}`;

      console.log('Sending email via Resend', {
        from: this.fromEmail,
        to: email,
        subject,
        hasApiKey: !!process.env.RESEND_API_KEY
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html
      });

      console.log('Email sent successfully via Resend', {
        email,
        resultId: result?.id,
        ticketCount
      });

      return result;
    } catch (error) {
      console.error('Failed to send payment confirmation email:', {
        email: typeof user === 'object' ? user.email : user,
        error: error.message,
        stack: error.stack,
        ticketCount: Array.isArray(ticketOrTickets) ? ticketOrTickets.length : 1,
        hasResendApiKey: !!process.env.RESEND_API_KEY,
        fromEmail: this.fromEmail
      });
      throw error;
    }
  }
}

module.exports = EmailAdapter;

