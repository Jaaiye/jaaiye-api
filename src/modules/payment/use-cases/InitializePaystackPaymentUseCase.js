/**
 * Initialize Paystack Payment Use Case
 * Application layer - business logic
 */

const { InitializePaymentDTO } = require('../dto');
const { PaymentInitializationError } = require('../errors');
const { calculateTicketBaseAmount, calculateChargeFromBase } = require('../services/PricingService');

class InitializePaystackPaymentUseCase {
  constructor({ paystackAdapter, eventRepository }) {
    this.paystackAdapter = paystackAdapter;
    this.eventRepository = eventRepository;
  }

  async execute(dto) {
    dto.validate();

    let event = null;
    if (dto.eventId) {
      event = await this.eventRepository.findByIdOrSlug(dto.eventId);
      if (event) {
        dto.eventId = event.id;
      }
    }

    // The amount actually charged is always computed server-side from the
    // event's real ticket prices - dto.amount is accepted for backward
    // compatibility but never used to decide what the buyer pays.
    const baseAmount = calculateTicketBaseAmount({
      event,
      ticketTypeIds: dto.ticketTypes,
      quantity: dto.quantity
    });
    const { totalAmount } = calculateChargeFromBase(baseAmount);

    try {
      const metadata = {
        eventId: dto.eventId,
        quantity: dto.quantity,
        userId: dto.userId
      };

      const result = await this.paystackAdapter.initializePayment({
        amount: totalAmount,
        email: dto.email,
        metadata
      });

      return {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference
      };
    } catch (error) {
      throw new PaymentInitializationError(error.message || 'Failed to initialize Paystack payment');
    }
  }
}

module.exports = InitializePaystackPaymentUseCase;

