/**
 * Cancel Event Use Case
 * Application layer - cancel an event and process refunds for all ticket holders
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');

class CancelEventUseCase {
  constructor({
    eventRepository,
    ticketRepository,
    transactionRepository,
    walletRefundService,
    userRepository,
    walletNotificationService,
    walletRepository
  }) {
    this.eventRepository = eventRepository;
    this.ticketRepository = ticketRepository;
    this.transactionRepository = transactionRepository;
    this.walletRefundService = walletRefundService;
    this.userRepository = userRepository;
    this.walletNotificationService = walletNotificationService;
    this.walletRepository = walletRepository;
  }

  async execute(eventId, userId, reason = 'Event cancelled by organizer') {
    const event = await this.eventRepository.findByIdOrSlug(eventId);

    if (!event) {
      throw new EventNotFoundError();
    }

    // Only event creator can cancel
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can cancel this event');
    }

    // Cannot cancel already cancelled or completed events
    if (event.status === 'cancelled') {
      throw new ValidationError('Event is already cancelled');
    }
    if (event.status === 'completed') {
      throw new ValidationError('Cannot cancel a completed event');
    }

    // Update event status to cancelled
    const updatedEvent = await this.eventRepository.update(event._id || event.id, {
      status: 'cancelled'
    });

    // Deactivate wallet for cancelled event
    if (event.category === 'event') {
      try {
        const wallet = await this.walletRepository.findByOwner('EVENT', event._id || event.id);
        if (wallet) {
          await this.walletRepository.update(wallet.id, { isActive: false });
        }
      } catch (walletError) {
        console.error(`Failed to deactivate wallet for cancelled event ${eventId}:`, walletError.message);
        // Don't fail cancellation if wallet deactivation fails
      }
    }

    // Process refunds for all tickets
    if (event.category === 'event' && event.attendeeCount > 0) {
      try {
        // Get all tickets for this event
        const tickets = await this.ticketRepository.findByEvent(event._id || event.id);

        // Group tickets by transaction to process refunds efficiently
        const ticketsByTransaction = new Map();

        for (const ticket of tickets) {
          if (ticket.status === 'active' && ticket.price > 0) {
            // Find the transaction for this ticket
            // Try to find transaction by eventId and userId
            const transactions = await this.transactionRepository.findByEvent(event._id || event.id);
            const transaction = transactions.find(tx =>
              tx.userId && String(tx.userId) === String(ticket.userId) && tx.status === 'successful'
            );

            if (transaction) {
              const txId = transaction.id || transaction._id;
              if (!ticketsByTransaction.has(txId)) {
                ticketsByTransaction.set(txId, {
                  transaction,
                  tickets: [],
                  totalAmount: 0
                });
              }
              const txGroup = ticketsByTransaction.get(txId);
              txGroup.tickets.push(ticket);
              txGroup.totalAmount += ticket.price * ticket.quantity;
            }
          }
        }

        // Process refunds for each transaction
        const refundPromises = Array.from(ticketsByTransaction.values()).map(async ({ transaction, tickets, totalAmount }) => {
          try {
            // Process refund via wallet refund service
            await this.walletRefundService.processRefund({
              ownerType: 'EVENT',
              ownerId: event._id || event.id,
              transactionEntity: transaction,
              refundAmount: totalAmount,
              reason: `Event cancelled: ${reason}`,
              refundReference: `cancel-${event._id || event.id}-${Date.now()}`
            });

            // Cancel all tickets for this transaction
            for (const ticket of tickets) {
              await this.ticketRepository.update(ticket.id, { status: 'cancelled' });
            }

            // Send refund notification email
            const user = await this.userRepository.findById(transaction.userId);
            if (user && user.email && this.walletNotificationService) {
              try {
                await this.walletNotificationService.sendWalletAdjustedRefundEmail({
                  user,
                  ownerLabel: event.title,
                  amount: totalAmount,
                  reason: `Event cancelled: ${reason}`,
                  walletBalanceAfter: 0 // User's refund goes back to their payment method, not wallet
                });
              } catch (emailError) {
                console.error('Failed to send refund notification email:', emailError.message);
              }
            }
          } catch (refundError) {
            console.error(`Failed to process refund for transaction ${transaction.id}:`, refundError.message);
            // Continue with other refunds even if one fails
          }
        });

        await Promise.all(refundPromises);

        // Handle complimentary tickets (just cancel them, no refund needed)
        const complimentaryTickets = tickets.filter(t => t.price === 0);
        for (const ticket of complimentaryTickets) {
          if (ticket.status === 'active') {
            await this.ticketRepository.update(ticket.id, { status: 'cancelled' });
          }
        }

      } catch (refundError) {
        console.error(`Failed to process refunds for cancelled event ${event._id || event.id}:`, refundError.message);
        // Don't fail cancellation if refund processing fails - log for manual intervention
      }
    }

    return updatedEvent;
  }
}

module.exports = CancelEventUseCase;

