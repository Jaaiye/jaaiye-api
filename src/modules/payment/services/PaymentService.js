/**
 * Payment Service Adapter
 * Infrastructure layer - handles successful payment processing
 * Integrates with Ticket domain to create tickets after successful payment
 */

const logger = require('../../../utils/logger');
const CreateTicketDTO = require('../../ticket/dto/CreateTicketDTO');

class PaymentService {
  constructor({
    transactionRepository,
    createTicketUseCase,
    userRepository,
    eventRepository,
    groupRepository,
    emailAdapter,
    walletService,
    walletNotificationService,
    sendNotificationUseCase
  }) {
    this.transactionRepository = transactionRepository;
    this.createTicketUseCase = createTicketUseCase;
    this.userRepository = userRepository;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
    this.emailAdapter = emailAdapter;
    this.walletService = walletService;
    this.walletNotificationService = walletNotificationService;
    this.sendNotificationUseCase = sendNotificationUseCase;
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
            // Populate ticket with event data for email
            const TicketSchema = require('../../ticket/entities/Ticket.schema');
            const populatedTicket = await TicketSchema.findById(ticket.id || ticket._id)
              .select('+qrCode +publicId') // Ensure these fields are included
              .populate('eventId', 'title startTime endTime venue image ticketTypes')
              .populate('userId', 'username fullName email')
              .lean();

            if (populatedTicket && populatedTicket.eventId && typeof populatedTicket.eventId === 'object') {
              const ticketForEmail = {
                ...populatedTicket,
                id: populatedTicket._id?.toString() || populatedTicket.id,
                qrCode: ticket.qrCode || populatedTicket.qrCode || null,
                ticketData: ticket.ticketData || populatedTicket.ticketData || null,
                publicId: ticket.publicId || populatedTicket.publicId || null,
                price: ticket.price || populatedTicket.price,
                quantity: ticket.quantity || populatedTicket.quantity,
                ticketTypeName: ticket.ticketTypeName || populatedTicket.ticketTypeName,
                status: ticket.status || populatedTicket.status
              };

              logger.info('Sending ticket email to assignee', {
                email,
                name,
                hasQrCode: !!ticketForEmail.qrCode,
                hasPublicId: !!ticketForEmail.publicId,
                publicId: ticketForEmail.publicId
              });

              await this.emailAdapter.sendPaymentConfirmationEmail(
                { email, fullName: name },
                ticketForEmail
              );

              logger.info('Ticket email sent to assignee successfully', {
                email,
                hasQrCode: !!ticketForEmail.qrCode,
                publicId: ticketForEmail.publicId
              });
            } else {
              logger.warn('Cannot send email to assignee - ticket missing event data', {
                email,
                ticketId: ticket.id || ticket._id,
                hasPopulatedTicket: !!populatedTicket,
                hasEventId: !!(populatedTicket && populatedTicket.eventId)
              });
            }
          } catch (emailError) {
            logger.error('Failed to send email to assignee', {
              email,
              error: emailError.message,
              stack: emailError.stack
            });
          }

          // Send push notification to assignee if they have an account
          if (this.sendNotificationUseCase) {
            try {
              // Try to find user by email
              const assigneeUser = await this.userRepository.findByEmail(email);
              if (assigneeUser) {
                const event = await this.eventRepository.findById(eventId);
                if (event) {
                  await this.sendNotificationUseCase.execute(
                    assigneeUser.id,
                    {
                      title: 'You\'ve Received a Ticket! 🎟️',
                      body: `${name || 'Someone'} purchased a ticket for "${event.title}" and assigned it to you. Check your email for details.`
                    },
                    {
                      type: 'payment_success',
                      eventId: eventId.toString(),
                      ticketId: ticket.id.toString(),
                      assignedBy: userId.toString(),
                      priority: 'high',
                      path: 'ticketsScreen'
                    }
                  );
                }
              }
            } catch (notificationError) {
              logger.warn('Failed to send push notification to assignee', { email, error: notificationError.message });
            }
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
          // Populate tickets with event data for email
          const TicketSchema = require('../../ticket/entities/Ticket.schema');
          const populatedTickets = await Promise.all(
            createdTickets.map(async (ticket) => {
              try {
                // Explicitly select qrCode and publicId fields
                const populated = await TicketSchema.findById(ticket.id || ticket._id)
                  .select('+qrCode +publicId') // Ensure these fields are included
                  .populate('eventId', 'title startTime endTime venue image ticketTypes')
                  .populate('userId', 'username fullName email')
                  .lean();

                if (populated && populated.eventId) {
                  // Ensure qrCode and publicId are included (from ticket entity or populated doc)
                  const ticketForEmail = {
                    ...populated,
                    id: populated._id?.toString() || populated.id,
                    qrCode: ticket.qrCode || populated.qrCode || null,
                    ticketData: ticket.ticketData || populated.ticketData || null,
                    publicId: ticket.publicId || populated.publicId || null,
                    price: ticket.price || populated.price,
                    quantity: ticket.quantity || populated.quantity,
                    ticketTypeName: ticket.ticketTypeName || populated.ticketTypeName,
                    status: ticket.status || populated.status
                  };

                  logger.debug('Ticket prepared for email', {
                    ticketId: ticketForEmail.id,
                    hasQrCode: !!ticketForEmail.qrCode,
                    hasPublicId: !!ticketForEmail.publicId,
                    publicId: ticketForEmail.publicId,
                    qrCodeType: typeof ticketForEmail.qrCode
                  });

                  return ticketForEmail;
                }
                return ticket;
              } catch (populateError) {
                logger.warn('Failed to populate ticket for email', {
                  ticketId: ticket.id || ticket._id,
                  error: populateError.message
                });
                return ticket;
              }
            })
          );

          // Filter out tickets without event data
          const validTickets = populatedTickets.filter(t => t.eventId && typeof t.eventId === 'object' && t.eventId.title);

          if (validTickets.length > 0) {
            logger.info('Sending ticket confirmation email', {
              userId,
              email: buyer.email,
              ticketCount: validTickets.length
            });

            await this.emailAdapter.sendPaymentConfirmationEmail(
              buyer,
              validTickets.length === 1 ? validTickets[0] : validTickets
            );

            logger.info('Ticket confirmation email sent successfully', { userId, email: buyer.email });
          } else {
            logger.warn('Cannot send email - tickets missing event data', {
              userId,
              totalTickets: createdTickets.length,
              validTickets: validTickets.length
            });
          }
        } else {
          logger.warn('Cannot send email - missing buyer or email', {
            userId,
            hasBuyer: !!buyer,
            hasEmail: !!(buyer && buyer.email),
            ticketCount: createdTickets.length
          });
        }
      } catch (emailError) {
        logger.error('Failed to send confirmation email', {
          userId,
          error: emailError.message,
          stack: emailError.stack,
          ticketCount: createdTickets.length
        });
      }

      // Send push and in-app notification to buyer
      if (createdTickets.length > 0 && this.sendNotificationUseCase) {
        try {
          const buyer = await this.userRepository.findById(userId);
          const event = await this.eventRepository.findById(eventId);

          if (buyer && event) {
            const ticketCount = createdTickets.length;
            const ticketText = ticketCount === 1 ? 'ticket' : 'tickets';
            const eventTitle = event.title || 'Event';

            logger.info('Sending ticket purchase notification', {
              userId,
              ticketCount,
              eventTitle
            });

            const notificationResult = await this.sendNotificationUseCase.execute(
              userId,
              {
                title: 'Ticket Purchase Successful! 🎉',
                body: `You've successfully purchased ${ticketCount} ${ticketText} for ${eventTitle}. Check your email for ticket details.`
              },
              {
                type: 'payment_success',
                eventId: eventId.toString(),
                ticketCount,
                transactionId: transaction.id.toString(),
                priority: 'high',
                path: 'ticketsScreen'
              }
            );

            logger.info('Ticket purchase notification sent successfully', {
              userId,
              notificationId: notificationResult?.id
            });
          } else {
            logger.warn('Cannot send notification - missing buyer or event', {
              userId,
              hasBuyer: !!buyer,
              hasEvent: !!event,
              eventId
            });
          }
        } catch (notificationError) {
          logger.error('Failed to send push notification', {
            userId,
            error: notificationError.message,
            stack: notificationError.stack,
            ticketCount: createdTickets.length
          });
        }
      } else {
        logger.warn('Notification not sent - missing requirements', {
          userId,
          hasTickets: createdTickets.length > 0,
          hasNotificationUseCase: !!this.sendNotificationUseCase
        });
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

