/**
 * Payment Service Adapter
 * Infrastructure layer - handles successful payment processing
 * Integrates with Ticket domain to create tickets after successful payment
 */

const logger = require('../../../utils/logger');
const CreateTicketDTO = require('../../ticket/dto/CreateTicketDTO');
const authService = require('../../auth/services/auth.service');

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
    logger.debug('Payment metadata', metadata);
    const { eventId, groupId, hangoutId, ticketTypeId, ticketTypes, quantity = 1, userId, assignees = [] } = metadata || {};

    // Parse metadata safely (Flutterwave sometimes stringifies arrays or objects in meta)
    let parsedTicketTypes = [];
    const targetTicketTypes = ticketTypes || [];
    if (Array.isArray(targetTicketTypes)) {
      parsedTicketTypes = targetTicketTypes;
    } else if (typeof targetTicketTypes === 'string') {
      try {
        const parsed = JSON.parse(targetTicketTypes);
        if (Array.isArray(parsed)) {
          parsedTicketTypes = parsed;
        }
      } catch (e) {
        // Not a JSON array string, maybe a single ID
        if (targetTicketTypes.trim()) {
          parsedTicketTypes = [targetTicketTypes.trim()];
        }
      }
    }

    // Group funding doesn't require eventId
    if (!groupId && (!eventId || !userId)) {
      return { ok: false, reason: 'missing_metadata' };
    }

    // Check for existing transaction
    let transaction = await this.transactionRepository.findByProviderAndReference(provider, reference);

    if (transaction && transaction.isSuccessful()) {
      return { ok: true, alreadyProcessed: true, transaction: transaction.toJSON() };
    }

    // Extract gateway fee from raw provider data if available
    let gatewayFee = 0;
    if (raw) {
      if (provider === 'flutterwave') {
        gatewayFee = Number(raw.app_fee || raw.fee || 0);
      } else if (provider === 'paystack') {
        gatewayFee = Number(raw.fees || 0) / 100; // Paystack returns fees in kobo
      }
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
        gatewayFee,
        status: 'pending'
      });
    }

    const createdTickets = [];

    // Fetch event to get ticket type details (for admission size/names)
    const event = eventId ? await this.eventRepository.findById(eventId) : null;

    // Handle assigned recipients
    if (Array.isArray(assignees) && assignees.length > 0) {
      for (const assignee of assignees) {
        const { name, email } = assignee;
        try {
          // Determine admission size based on ticket type
          let admissionSize = 1;
          if (event && event.ticketTypes) {
            const tt = event.ticketTypes.id ? event.ticketTypes.id(ticketTypeId) : event.ticketTypes.find(t => String(t._id || t.id) === String(ticketTypeId));
            if (tt) {
              admissionSize = tt.admissionSize || 1;
            }
          }

          const ticketDTO = new CreateTicketDTO({
            eventId,
            ticketTypeId: ticketTypeId || null,
            userId,
            quantity: 1,
            admissionSize,
            bypassCapacity: false,
            transactionId: transaction.id || transaction._id
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
                      path: 'ticketsDetailsScreen',
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
      // Support both single ticketTypeId and array of ticketTypes
      const ticketTypesToCreate = parsedTicketTypes.length > 0 ? parsedTicketTypes : Array(quantity).fill(ticketTypeId);

      logger.info('[PaymentService] Creating tickets', {
        ticketTypesLength: parsedTicketTypes.length,
        quantity,
        ticketTypesToCreate,
        totalToCreate: ticketTypesToCreate.length,
        hasEvent: !!event
      });

      for (let i = 0; i < ticketTypesToCreate.length; i++) {
        try {
          const currentTicketTypeId = ticketTypesToCreate[i];

          // Determine admission size based on ticket type
          let admissionSize = 1;
          if (event && event.ticketTypes) {
            const tt = event.ticketTypes.id ? event.ticketTypes.id(currentTicketTypeId) : event.ticketTypes.find(t => String(t._id || t.id) === String(currentTicketTypeId));
            if (tt) {
              admissionSize = tt.admissionSize || 1;
            }
          }

          logger.info(`[PaymentService] Creating ticket ${i + 1}/${ticketTypesToCreate.length}`, {
            ticketTypeId: currentTicketTypeId,
            admissionSize
          });

          const ticketDTO = new CreateTicketDTO({
            eventId,
            ticketTypeId: currentTicketTypeId,
            userId,
            quantity: 1, // Each record is a unique QR code
            admissionSize: admissionSize, // Number of people this ticket admits
            bypassCapacity: false,
            skipEmail: true, // Prevent individual emails, we'll send one consolidated email
            transactionId: transaction.id || transaction._id
          });
          const ticket = await this.createTicketUseCase.execute(ticketDTO);
          createdTickets.push(ticket);

          logger.info(`[PaymentService] Ticket ${i + 1} created successfully`, {
            ticketId: ticket.id,
            ticketTypeId: currentTicketTypeId,
            admissionSize
          });
        } catch (ticketError) {
          logger.error('Failed to create ticket', {
            index: i,
            ticketTypeId: ticketTypesToCreate[i],
            error: ticketError.message
          });
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
                path: 'ticketsDetailsScreen',
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

    // Notify event creator about ticket sale
    if (this.sendNotificationUseCase && event && event.creatorId) {
      try {
        const creator = await this.userRepository.findById(event.creatorId);

        // Don't notify if creator bought their own ticket (shouldn't happen with restrictions)
        if (creator && String(creator.id) !== String(userId)) {
          const ticketCount = createdTickets.length;
          const ticketText = ticketCount === 1 ? 'ticket' : 'tickets';
          const ticketTotalAmount = createdTickets.reduce((sum, t) => sum + Number(t.price || 0), 0);

          logger.info('Sending ticket sale notification to event creator', {
            creatorId: event.creatorId,
            eventId,
            ticketCount,
            amount: ticketTotalAmount
          });

          await this.sendNotificationUseCase.execute(
            event.creatorId,
            {
              title: '🎉 New Ticket Sale!',
              body: `${ticketCount} ${ticketText} purchased for "${event.title}". Total: ₦${ticketTotalAmount.toLocaleString()}`
            },
            {
              type: 'ticket_sale',
              eventId: eventId.toString(),
              buyerId: userId.toString(),
              ticketCount,
              amount: ticketTotalAmount,
              priority: 'medium',
              path: `https://events.jaaiye.com/events/${event.slug}/analytics`,
            }
          );

          // Send email notification to creator
          if (this.emailAdapter && creator.email) {
            try {
              const buyer = await this.userRepository.findById(userId);
              await this.emailAdapter.sendTicketSaleNotificationEmail(
                creator,
                {
                  eventTitle: event.title,
                  ticketCount,
                  amount: ticketTotalAmount,
                  buyerName: buyer?.fullName || 'A customer',
                  eventId
                },
                authService.generateToken(creator)
              );

              logger.info('Ticket sale email sent to event creator', {
                creatorId: event.creatorId,
                creatorEmail: creator.email
              });
            } catch (emailError) {
              logger.error('Failed to send ticket sale email to creator', {
                creatorId: event.creatorId,
                error: emailError.message
              });
            }
          }

          logger.info('Ticket sale notification sent to event creator successfully', {
            creatorId: event.creatorId
          });
        }
      } catch (creatorNotificationError) {
        logger.error('Failed to notify event creator about ticket sale', {
          eventId,
          creatorId: event.creatorId,
          error: creatorNotificationError.message,
          stack: creatorNotificationError.stack
        });
      }
    }

    // Mark transaction as successful
    transaction.markAsSuccessful();
    await this.transactionRepository.update(transaction.id, {
      status: 'successful',
      gatewayFee: gatewayFee || transaction.gatewayFee
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

