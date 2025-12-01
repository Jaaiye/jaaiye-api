/**
 * Payment Service Adapter
 * Infrastructure layer - handles successful payment processing
 * Integrates with Ticket domain to create tickets after successful payment
 */

const logger = require('../../../../utils/logger');
const { CreateTicketDTO } = require('../../application/dto');

class PaymentService {
  constructor({
    transactionRepository,
    createTicketUseCase,
    userRepository,
    eventRepository,
    emailAdapter
  }) {
    this.transactionRepository = transactionRepository;
    this.createTicketUseCase = createTicketUseCase;
    this.userRepository = userRepository;
    this.eventRepository = eventRepository;
    this.emailAdapter = emailAdapter;
  }

  /**
   * Handle successful payment
   * @param {Object} paymentData - { provider, reference, amount, currency, metadata, raw }
   * @returns {Promise<Object>}
   */
  async handleSuccessfulPayment({ provider, reference, amount, currency, metadata, raw }) {
    const { eventId, ticketTypeId, quantity = 1, userId, assignees = [] } = metadata || {};

    if (!eventId || !userId) {
      return { ok: false, reason: 'missing_metadata' };
    }

    // Check for existing transaction
    let transaction = await this.transactionRepository.findByProviderAndReference(provider, reference);

    if (transaction && transaction.isSuccessful()) {
      return { ok: true, alreadyProcessed: true, transaction: transaction.toJSON() };
    }

    // Create or update transaction
    if (!transaction) {
      transaction = await this.transactionRepository.create({
        provider,
        reference,
        amount,
        currency,
        userId,
        eventId,
        ticketTypeId: ticketTypeId || null,
        quantity,
        raw,
        status: 'pending'
      });
    }

    const createdTickets = [];

    // Handle assigned recipients
    if (Array.isArray(assignees) && assignees.length > 0) {
      for (const assignee of assignees) {
        const { name, email } = assignee;
        try {
          const ticketDTO = new CreateTicketDTO({
            eventId,
            userId,
            quantity: 1,
            complimentary: false,
            bypassCapacity: false
          });
          const ticket = await this.createTicketUseCase.execute(ticketDTO);
          createdTickets.push(ticket);

          // Send email to assignee
          try {
            await this.emailAdapter.sendPaymentConfirmationEmail(
              { email, fullName: name },
              ticket
            );
          } catch (emailError) {
            logger.warn('Failed to send email to assignee', { email, error: emailError.message });
          }
        } catch (ticketError) {
          logger.error('Failed to create ticket for assignee', { assignee, error: ticketError.message });
        }
      }
    } else {
      // Single buyer or unassigned multiple tickets
      for (let i = 0; i < quantity; i++) {
        try {
          const ticketDTO = new CreateTicketDTO({
            eventId,
            ticketTypeId,
            userId,
            quantity: 1,
            complimentary: false,
            bypassCapacity: false
          });
          const ticket = await this.createTicketUseCase.execute(ticketDTO);
          createdTickets.push(ticket);
        } catch (ticketError) {
          logger.error('Failed to create ticket', { error: ticketError.message });
        }
      }

      // Send confirmation email to buyer (with all tickets if multiple)
      try {
        const buyer = await this.userRepository.findById(userId);
        if (buyer && buyer.email && createdTickets.length > 0) {
          await this.emailAdapter.sendPaymentConfirmationEmail(
            buyer,
            createdTickets.length === 1 ? createdTickets[0] : createdTickets
          );
        }
      } catch (emailError) {
        logger.warn('Failed to send confirmation email', { userId, error: emailError.message });
      }
    }

    // Mark transaction as successful
    transaction.markAsSuccessful();
    await this.transactionRepository.update(transaction.id, {
      status: 'successful'
    });

    // TODO: Add Google Calendar integration here if needed
    // This can be done via the Calendar domain's use cases

    return {
      ok: true,
      tickets: createdTickets.map(t => t.toJSON ? t.toJSON() : t),
      transaction: transaction.toJSON()
    };
  }
}

module.exports = PaymentService;

