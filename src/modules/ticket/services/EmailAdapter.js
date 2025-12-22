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
        throw new Error('Email is required');
      }

      const tickets = Array.isArray(ticketOrTickets) ? ticketOrTickets : [ticketOrTickets];

      if (!tickets || tickets.length === 0) {
        throw new Error('At least one ticket is required');
      }

      const firstTicket = tickets[0];
      if (!firstTicket.eventId) {
        throw new Error('Ticket must have event information');
      }

      const ticketCount = tickets.length;
      const eventTitle = firstTicket.eventId?.title || 'Event';

      const html = templates.paymentConfirmationEmail({ tickets });

      const subject = ticketCount > 1
        ? `🎟️ Payment Confirmed! Your ${ticketCount} Tickets for ${eventTitle}`
        : `🎟️ Payment Confirmed! Your Ticket for ${eventTitle}`;

      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html
      });
    } catch (error) {
      console.error('Failed to send payment confirmation email:', error);
      throw error;
    }
  }
}

module.exports = EmailAdapter;

