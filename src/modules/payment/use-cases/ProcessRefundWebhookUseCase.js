/**
 * Process Refund Webhook Use Case
 * Application layer - handles refund/chargeback webhooks
 */

const logger = require('../../../utils/logger');

class ProcessRefundWebhookUseCase {
  constructor({
    transactionRepository,
    walletRefundService,
    eventRepository,
    groupRepository,
    userRepository,
    walletNotificationService
  }) {
    this.transactionRepository = transactionRepository;
    this.walletRefundService = walletRefundService;
    this.eventRepository = eventRepository;
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.walletNotificationService = walletNotificationService;
  }

  async execute(webhookResult) {
    const { reference, refundReference, amount, ok, raw } = webhookResult;

    if (!reference) {
      logger.warn('Refund webhook missing transaction reference');
      return { ok: false, reason: 'missing_reference' };
    }

    if (!ok) {
      logger.warn('Refund webhook indicates failure', { reference });
      return { ok: false, reason: 'refund_failed' };
    }

    // Find original transaction
    const transaction = await this.transactionRepository.findByProviderAndReference(
      webhookResult.provider || 'flutterwave',
      reference
    );

    if (!transaction) {
      logger.warn('Original transaction not found for refund', { reference });
      return { ok: false, reason: 'transaction_not_found' };
    }

    // Determine owner type and ID from transaction
    const eventId = transaction.eventId || transaction.event?.id;
    let ownerType = null;
    let ownerId = null;

    if (eventId) {
      const event = await this.eventRepository.findById(eventId);
      if (event) {
        if (event.category === 'event') {
          ownerType = 'EVENT';
          ownerId = eventId;
        } else if (event.category === 'hangout') {
          // Hangout belongs to a group
          // We need to find which group this hangout belongs to
          // For now, we'll check if there's a groupId in metadata
          const metadata = transaction.metadata || transaction.raw?.meta || {};
          if (metadata.groupId) {
            ownerType = 'GROUP';
            ownerId = metadata.groupId;
          } else {
            logger.warn('Hangout refund but no groupId found', { eventId });
            return { ok: false, reason: 'group_not_found' };
          }
        }
      }
    }

    // Check metadata for groupId (for direct group funding)
    if (!ownerType) {
      const metadata = transaction.metadata || transaction.raw?.meta || {};
      if (metadata.groupId) {
        ownerType = 'GROUP';
        ownerId = metadata.groupId;
      }
    }

    if (!ownerType || !ownerId) {
      logger.warn('Could not determine wallet owner for refund', {
        transactionId: transaction.id,
        eventId
      });
      return { ok: false, reason: 'owner_not_determined' };
    }

    // Process refund
    try {
      const refundResult = await this.walletRefundService.processRefund({
        ownerType,
        ownerId,
        transactionEntity: transaction,
        refundAmount: amount,
        reason: 'refund',
        refundReference: refundReference || reference
      });

      // Send notification to wallet owner
      if (this.walletNotificationService) {
        try {
          let owner = null;
          let ownerLabel = null;

          if (ownerType === 'EVENT') {
            const event = await this.eventRepository.findById(ownerId);
            if (event && event.origin === 'user' && event.creatorId) {
              owner = await this.userRepository.findById(event.creatorId);
              ownerLabel = event.title;
            }
          } else if (ownerType === 'GROUP') {
            const group = await this.groupRepository.findById(ownerId);
            if (group && group.creator) {
              owner = await this.userRepository.findById(group.creator);
              ownerLabel = group.name;
            }
          }

          if (owner && owner.email) {
            await this.walletNotificationService.sendWalletAdjustedRefundEmail({
              user: owner,
              ownerLabel,
              amount: amount,
              reason: 'Refund processed',
              walletBalanceAfter: refundResult.walletBalanceAfter
            });
          }
        } catch (emailError) {
          logger.error('Failed to send refund notification email', {
            ownerType,
            ownerId,
            error: emailError.message
          });
        }
      }

      return {
        ok: true,
        transactionId: transaction.id,
        ownerType,
        ownerId,
        refundAmount: amount,
        walletBalanceAfter: refundResult.walletBalanceAfter
      };
    } catch (refundError) {
      logger.error('Failed to process refund', {
        transactionId: transaction.id,
        error: refundError.message
      });
      return { ok: false, reason: 'refund_processing_failed', error: refundError.message };
    }
  }
}

module.exports = ProcessRefundWebhookUseCase;

