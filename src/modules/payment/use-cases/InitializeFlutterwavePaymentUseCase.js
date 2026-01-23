/**
 * Initialize Flutterwave Payment Use Case
 * Application layer - business logic
 */

const { PaymentInitializationError } = require('../errors');

class InitializeFlutterwavePaymentUseCase {
  constructor({ flutterwaveAdapter, eventRepository, eventTeamRepository }) {
    this.flutterwaveAdapter = flutterwaveAdapter;
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
  }

  async execute(dto, idempotencyKey) {
    dto.validate();

    try {
      // Validate that user is not event creator or team member
      if (dto.eventId && dto.userId) {
        const event = await this.eventRepository.findById(dto.eventId);

        if (event) {
          // Check if user is the event creator
          if (event.creatorId && String(event.creatorId) === String(dto.userId)) {
            throw new PaymentInitializationError(
              'Event creators cannot purchase tickets. Please issue complimentary tickets from the event management page.'
            );
          }

          // Check if user is a team member
          if (this.eventTeamRepository) {
            try {
              const teamMember = await this.eventTeamRepository.findByEventAndUser(dto.eventId, dto.userId);
              if (teamMember && teamMember.status === 'accepted') {
                throw new PaymentInitializationError(
                  'Event team members cannot purchase tickets. Please issue complimentary tickets from the event management page.'
                );
              }
            } catch (teamError) {
              // If team check fails, log but continue (team feature might not be available)
              if (teamError instanceof PaymentInitializationError) {
                throw teamError;
              }
              console.warn('Team member check failed:', teamError.message);
            }
          }
        }
      }

      const metadata = {
        eventId: dto.eventId,
        quantity: dto.quantity,
        userId: dto.userId,
        ticketTypes: Array.isArray(dto.ticketTypes) ? JSON.stringify(dto.ticketTypes) : (dto.ticketTypes || '[]')
      };

      const result = await this.flutterwaveAdapter.initializePayment({
        amount: dto.amount,
        reference: dto.reference,
        email: dto.email,
        metadata,
        idempotencyKey
      });

      return {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        idempotencyKey: result.idempotencyKey,
        isCachedResponse: result.isCachedResponse
      };
    } catch (error) {
      if (error instanceof PaymentInitializationError) {
        throw error;
      }
      throw new PaymentInitializationError(error.message || 'Failed to initialize Flutterwave payment');
    }
  }
}

module.exports = InitializeFlutterwavePaymentUseCase;

