/**
 * Issue Ticket Use Case
 * Application layer - organizer-issued tickets that don't go through the
 * normal paid-checkout flow: complimentary, or cash collected off-platform
 * (manual_payment / onsite).
 *
 * Extracted from the ad-hoc logic that used to live directly in
 * EventController#issueTicket, so payment-method handling - especially
 * crediting the event wallet for a cash sale - lives in one tested place
 * instead of being reimplemented per caller.
 */

const crypto = require('crypto');
const { EventNotFoundError, EventAccessDeniedError } = require('../errors');
const { NotFoundError, BadRequestError } = require('../../common/errors');
const { canUserManageTicketTypes } = require('../services/EventOwnershipService');
const CreateTicketDTO = require('../../ticket/dto/CreateTicketDTO');
const { splitTotalIntoBaseAndFee } = require('../../payment/services/PricingService');

const PAYMENT_METHODS = ['complimentary', 'manual_payment', 'onsite'];
const CASH_PAYMENT_METHODS = ['manual_payment', 'onsite'];

class IssueTicketUseCase {
  constructor({
    eventRepository,
    eventTeamRepository,
    userRepository,
    ticketRepository,
    createTicketUseCase,
    transactionRepository,
    walletService
  }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
    this.userRepository = userRepository;
    this.ticketRepository = ticketRepository;
    this.createTicketUseCase = createTicketUseCase;
    this.transactionRepository = transactionRepository;
    this.walletService = walletService;
  }

  /**
   * @param {Object} params
   * @param {string} params.eventId
   * @param {string} params.issuedBy - organizer/team-member userId issuing the ticket
   * @param {string} [params.ticketTypeId]
   * @param {number} [params.quantity=1]
   * @param {string} [params.username] - target user, one of username/email required
   * @param {string} [params.email]
   * @param {boolean} [params.bypassCapacity=false]
   * @param {'complimentary'|'manual_payment'|'onsite'} [params.paymentMethod='complimentary']
   * @param {number} [params.amount] - required for manual_payment/onsite: the gross
   *   amount actually collected off-platform. Credited to the event wallet through
   *   the exact same path (WalletService.fundWalletFromTransaction) a Flutterwave-
   *   confirmed purchase uses, via a synthetic but real Transaction record - so
   *   there is only ever one wallet-crediting code path to keep correct, not a
   *   second one that can drift out of sync with it.
   */
  async execute({
    eventId,
    issuedBy,
    ticketTypeId = null,
    quantity = 1,
    username,
    email,
    bypassCapacity = false,
    paymentMethod = 'complimentary',
    amount
  }) {
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new BadRequestError(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
    }

    const isCashSale = CASH_PAYMENT_METHODS.includes(paymentMethod);
    let collectedAmount = null;
    if (isCashSale) {
      collectedAmount = Number(amount);
      if (!Number.isFinite(collectedAmount) || collectedAmount <= 0) {
        throw new BadRequestError('amount is required and must be a positive number for manual_payment/onsite tickets');
      }
    }

    const event = await this.eventRepository.findByIdOrSlug(eventId);
    if (!event) {
      throw new EventNotFoundError();
    }

    const isCreator = event.creatorId && String(event.creatorId) === String(issuedBy);
    const teamMember = isCreator
      ? null
      : await this.eventTeamRepository.findByEventAndUser(event.id, issuedBy);

    if (!canUserManageTicketTypes({ eventEntity: event, userId: issuedBy, teamMember })) {
      throw new EventAccessDeniedError('You do not have permission to issue tickets for this event');
    }

    let targetUser = null;
    if (username) {
      targetUser = await this.userRepository.findByUsername(username);
    }
    if (!targetUser && email) {
      targetUser = await this.userRepository.findByEmail(email);
    }
    if (!targetUser) {
      throw new NotFoundError('User not found with the provided username or email');
    }

    // Deliberately not overriding dto.price here: CreateTicketUseCase only
    // resolves and decrements a specific ticket type's soldCount when no
    // price override is given (see _determineTicketPricing). Passing a
    // custom price up front would skip that resolution and silently leave
    // the tier's inventory uncounted. Instead we let it price/decrement
    // normally, then correct the stored price below once we know the real
    // amount involved.
    const dto = new CreateTicketDTO({
      eventId: event.id,
      ticketTypeId,
      quantity,
      userId: targetUser.id,
      bypassCapacity
    });

    let ticket = await this.createTicketUseCase.execute(dto);

    let transaction = null;
    let walletFunding = null;

    if (paymentMethod === 'complimentary') {
      // Comped regardless of the picked tier's listed price.
      if (Number(ticket.price) !== 0) {
        ticket = await this.ticketRepository.update(ticket.id, { price: 0 });
      }
    } else {
      // Cash collected off-platform - record it as a real Transaction so it
      // can be credited to the event wallet through the normal path, and
      // correct the ticket's stored price to what was actually collected
      // (may differ from the tier's list price, e.g. a door discount).
      const reference = `issue_${paymentMethod}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const { baseAmount, feeAmount } = splitTotalIntoBaseAndFee(collectedAmount);

      transaction = await this.transactionRepository.create({
        provider: paymentMethod,
        reference,
        amount: collectedAmount,
        baseAmount,
        feeAmount,
        gatewayFee: 0,
        currency: 'NGN',
        status: 'successful',
        userId: targetUser.id,
        eventId: event.id,
        ticketTypeId: ticketTypeId || undefined,
        quantity,
        metadata: { issuedBy, paymentMethod }
      });

      ticket = await this.ticketRepository.update(ticket.id, {
        price: collectedAmount,
        transactionId: transaction.id
      });

      walletFunding = await this.walletService.fundWalletFromTransaction({
        ownerType: 'EVENT',
        ownerId: event.id,
        transactionEntity: transaction
      });
    }

    return { ticket, transaction, walletFunding };
  }
}

module.exports = IssueTicketUseCase;
