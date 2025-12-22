/**
 * Payment Service Adapter
 * Infrastructure layer - handles successful payment processing
 * Integrates with Ticket domain to create tickets after successful payment
 */

const logger = require('../../../utils/logger');
const { CreateTicketDTO } = require('../../ticket/dto/CreateTicketDTO');

class PaymentService {
  constructor({
    transactionRepository,
    createTicketUseCase,
    userRepository,
    eventRepository,
    groupRepository,
    emailAdapter,
    walletService,
    walletNotificationService
  }) {
    this.transactionRepository = transactionRepository;
    this.createTicketUseCase = createTicketUseCase;
    this.userRepository = userRepository;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
    this.emailAdapter = emailAdapter;
    this.walletService = walletService;
    this.walletNotificationService = walletNotificationService;
  }

  /**
   * Handle successful payment
   * @param {Object} paymentData - { provider, reference, amount, currency, metadata, raw }
   * @returns {Promise<Object>}
   */
  async handleSuccessfulPayment({ provider, reference, amount, currency, metadata, raw }) {
    const { eventId, groupId, hangoutId, ticketTypeId, quantity = 1, userId, assignees = [] } = metadata || {};

    // Group funding doesn't require eventId
    if (!groupId && (!eventId || !userId)) {
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

    // Fund wallets with 10% exclusive fee
    if (this.walletService) {
      try {
        // Handle group funding
        if (groupId) {
          const group = await this.groupRepository.findById(groupId);
          if (group) {
            const fundingResult = await this.walletService.fundWalletFromTransaction({
              ownerType: 'GROUP',
              ownerId: groupId,
              transactionEntity: transaction,
              hangoutId: hangoutId || null
            });

            // Notify group creator about wallet credit
            if (this.walletNotificationService && group.creator) {
              const creator = await this.userRepository.findById(group.creator);
              if (creator && creator.email) {
                const grossAmount = Number(transaction.amount);
                const feeAmount = grossAmount * 0.10;
                const netAmount = grossAmount - feeAmount;
                const walletBalanceAfter = fundingResult.walletBalance;

                // Get hangout title if hangoutId provided
                let hangoutTitle = null;
                if (hangoutId) {
                  try {
                    const hangout = await this.eventRepository.findById(hangoutId);
                    if (hangout) {
                      hangoutTitle = hangout.title;
                    }
                  } catch (err) {
                    logger.warn('Failed to load hangout for group funding email', { hangoutId, error: err.message });
                  }
                }

                await this.walletNotificationService.sendGroupWalletCreditedEmail({
                  user: creator,
                  groupName: group.name,
                  hangoutTitle,
                  amount: grossAmount,
                  feeAmount,
                  netAmount,
                  walletBalanceAfter
                });
              }
            }
          }
        }
        // Handle event wallet funding (category === 'event')
        else if (eventId) {
          const event = await this.eventRepository.findById(eventId);
          if (event && event.category === 'event') {
            const fundingResult = await this.walletService.fundWalletFromTransaction({
              ownerType: 'EVENT',
              ownerId: eventId,
              transactionEntity: transaction
            });

            // Notify event owner about wallet credit (user-origin events only)
            if (this.walletNotificationService && event.origin === 'user' && event.creatorId) {
              const owner = await this.userRepository.findById(event.creatorId);
              if (owner && owner.email) {
                const grossAmount = Number(transaction.amount);
                const feeAmount = grossAmount * 0.10;
                const netAmount = grossAmount;
                const walletBalanceAfter = fundingResult.walletBalance;

                await this.walletNotificationService.sendEventWalletCreditedEmail({
                  user: owner,
                  eventTitle: event.title,
                  grossAmount,
                  feeAmount,
                  netAmount,
                  walletBalanceAfter
                });
              }
            }
          }
        }
      } catch (walletError) {
        logger.error('Failed to fund wallet from transaction', {
          eventId,
          groupId,
          reference,
          error: walletError.message
        });
      }
    }

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

