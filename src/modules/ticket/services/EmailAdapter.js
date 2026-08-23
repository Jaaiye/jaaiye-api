/**
 * Ticket Email Adapter
 * Infrastructure layer - email service adapter for tickets
 */

const { Resend } = require('resend');
const templates = require('../../../emails/templates');
const logger = require('../../../utils/logger');

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

      const subject = ticketCount > 1
        ? `🎟️ Payment Confirmed! Your ${ticketCount} Tickets for ${eventTitle}`
        : `🎟️ Payment Confirmed! Your Ticket for ${eventTitle}`;

      logger.debug('Sending email via Resend', {
        from: this.fromEmail,
        to: email,
        subject,
        hasApiKey: !!process.env.RESEND_API_KEY
      });

      const html = templates.paymentConfirmationEmail({ tickets });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html
      });

      logger.debug('Email sent successfully via Resend', {
        email,
        resultId: result?.id,
        ticketCount
      });

      return result;
    } catch (error) {
      logger.error('Failed to send payment confirmation email:', {
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

  /**
   * Send ticket sale notification email to event creator
   * @param {Object} creator - Creator user object with email, fullName
   * @param {Object} saleData - Sale data with eventTitle, ticketCount, amount, buyerName, eventId
   * @returns {Promise<void>}
   */
  async sendTicketSaleNotificationEmail(creator, saleData, accessToken) {
    try {
      const email = creator.email;

      if (!email) {
        throw new Error('Creator email is required');
      }

      const { eventTitle, ticketCount, amount, buyerName, eventId } = saleData;

      if (!eventTitle || !ticketCount || amount === undefined) {
        throw new Error('Sale data must include eventTitle, ticketCount, and amount');
      }

      logger.debug('Generating ticket sale notification email', {
        email,
        eventTitle,
        ticketCount,
        amount
      });

      const html = templates.ticketSaleNotificationEmail({
        eventTitle,
        ticketCount,
        amount,
        buyerName: buyerName || 'A customer',
        eventId,
        accessToken
      });

      const ticketText = ticketCount === 1 ? 'ticket' : 'tickets';
      const subject = `🎉 New Ticket Sale for ${eventTitle}`;

      logger.debug('Sending ticket sale notification via Resend', {
        from: this.fromEmail,
        to: email,
        subject
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html
      });

      logger.debug('Ticket sale notification sent successfully', {
        email,
        resultId: result?.id
      });

      return result;
    } catch (error) {
      logger.error('Failed to send ticket sale notification email:', {
        email: creator.email,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Send system alert email to admin
   * @param {string} subject - Alert subject
   * @param {string} message - Alert message
   * @returns {Promise<void>}
   */
  async sendSystemAlert(subject, message) {
    try {
      const adminEmail = 'letsjaaiye@gmail.com'; // User's email from recorded CCs

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: adminEmail,
        subject: `🚨 SYSTEM ALERT: ${subject}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ff4444; border-radius: 8px;">
            <h2 style="color: #ff4444;">System Alert</h2>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Time (WAT):</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <hr />
            <p style="font-size: 12px; color: #666;">This is an automated message from the Jaaiye monitoring system.</p>
          </div>
        `
      });

      return result;
    } catch (error) {
      logger.error('Failed to send system alert email:', error.message);
    }
  }

  /**
   * Send a detailed alert email for an unhandled/programming server error.
   * @param {Error} error - The error object (name, message, stack)
   * @param {Object} context - Sanitized request/process context (method, url, userId, statusCode, traceId)
   * @returns {Promise<void>}
   */
  async sendErrorAlert(error, context = {}) {
    try {
      const alertEmail = process.env.ERROR_ALERT_EMAIL || 'jaaiyedev@gmail.com';

      const {
        method = 'N/A',
        url = 'N/A',
        userId = 'unauthenticated',
        statusCode = 500,
        traceId = 'no-trace-id'
      } = context;

      const escapedStack = (error.stack || 'No stack trace available').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cooldownMinutes = Math.round((parseInt(process.env.ERROR_ALERT_COOLDOWN_MS, 10) || 600000) / 60000);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: alertEmail,
        subject: `🔥 Server Error: ${error.name || 'Error'} - ${error.message}`.slice(0, 150),
        html: `
          <div style="font-family: monospace, sans-serif; padding: 20px; border: 1px solid #ff4444; border-radius: 8px; max-width: 700px;">
            <h2 style="color: #ff4444; margin-top: 0;">🔥 Unhandled Server Error</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr><td style="padding: 4px 8px; font-weight: bold;">Error</td><td style="padding: 4px 8px;">${error.name || 'Error'}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">Message</td><td style="padding: 4px 8px;">${error.message}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">Status Code</td><td style="padding: 4px 8px;">${statusCode}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">Method</td><td style="padding: 4px 8px;">${method}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">URL</td><td style="padding: 4px 8px;">${url}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">User ID</td><td style="padding: 4px 8px;">${userId}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">Trace ID</td><td style="padding: 4px 8px;">${traceId}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">Environment</td><td style="padding: 4px 8px;">${process.env.NODE_ENV || 'development'}</td></tr>
              <tr><td style="padding: 4px 8px; font-weight: bold;">Time (WAT)</td><td style="padding: 4px 8px;">${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}</td></tr>
            </table>
            <h3 style="margin-bottom: 4px;">Stack Trace</h3>
            <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; font-size: 12px;">${escapedStack}</pre>
            <hr />
            <p style="font-size: 12px; color: #666;">Automated alert from the Jaaiye error monitoring system. Repeats of the same error are throttled to at most once every ${cooldownMinutes} minutes.</p>
          </div>
        `
      });

      return result;
    } catch (sendError) {
      logger.error('Failed to send error alert email:', sendError.message);
    }
  }
}

module.exports = EmailAdapter;

