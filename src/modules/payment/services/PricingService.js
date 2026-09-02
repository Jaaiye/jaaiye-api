/**
 * PricingService
 * Pure fee/price calculations - no persistence, no DI dependencies.
 *
 * The buyer pays ticketPrice + serviceFee at checkout; the organizer's
 * wallet is funded with the full ticket price. The service fee is never
 * deducted from the wallet - it's split out of the gateway-confirmed
 * total and routed straight to the platform wallet.
 */

const { SERVICE_FEE_PERCENT, SERVICE_FEE_FLAT } = require('../../../constants/paymentConstants');

/**
 * Given a ticket price (base amount), compute the service fee and the
 * total the buyer is charged at checkout.
 *
 * @param {number} baseAmount
 * @returns {{ baseAmount: number, feeAmount: number, totalAmount: number }}
 */
function calculateChargeFromBase(baseAmount) {
  const base = Number(baseAmount) || 0;
  if (base <= 0) {
    return { baseAmount: 0, feeAmount: 0, totalAmount: 0 };
  }

  const feeAmount = Math.round(base * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT;
  return { baseAmount: base, feeAmount, totalAmount: base + feeAmount };
}

/**
 * Inverse of calculateChargeFromBase: given the gateway-confirmed total a
 * buyer actually paid, recover how much of it is ticket price (destined
 * for the organizer's wallet) vs service fee (destined for the platform
 * wallet). This is the source of truth for wallet funding/refunds -
 * derived from the known fee formula and the confirmed total, never from
 * a client-editable field.
 *
 * @param {number} totalAmount
 * @returns {{ baseAmount: number, feeAmount: number }}
 */
function splitTotalIntoBaseAndFee(totalAmount) {
  const total = Number(totalAmount) || 0;
  if (total <= SERVICE_FEE_FLAT) {
    // Too small for the flat fee to make sense as a real ticket sale
    // (e.g. a free/complimentary ticket, or an edge case amount) -
    // treat it as pure fee rather than produce a negative base amount.
    return { baseAmount: 0, feeAmount: total };
  }

  const baseAmount = Math.round((total - SERVICE_FEE_FLAT) / (1 + SERVICE_FEE_PERCENT));
  const feeAmount = total - baseAmount; // derived, not independently rounded, so they always sum to total
  return { baseAmount, feeAmount };
}

/**
 * Resolve the total ticket price (base amount, before fee) for a purchase
 * against the event's real ticket type prices in the DB - never trusts a
 * client-supplied price.
 *
 * @param {Object} params
 * @param {Object} params.event - Event document/entity with a ticketTypes array
 * @param {string[]} [params.ticketTypeIds] - Flat array of ticket type IDs, one per physical ticket
 * @param {number} [params.quantity] - Used only for the legacy single-ticketFee fallback
 * @returns {number}
 */
function calculateTicketBaseAmount({ event, ticketTypeIds = [], quantity = 1 }) {
  if (!event) return 0;

  const findTicketType = (id) => {
    if (!event.ticketTypes) return null;
    return event.ticketTypes.id
      ? event.ticketTypes.id(id)
      : event.ticketTypes.find(t => String(t._id || t.id) === String(id));
  };

  if (Array.isArray(ticketTypeIds) && ticketTypeIds.length > 0) {
    return ticketTypeIds.reduce((sum, id) => {
      const ticketType = findTicketType(id);
      return sum + Number(ticketType ? ticketType.price : 0);
    }, 0);
  }

  // Legacy fallback: event has no ticketTypes array, just a flat ticketFee
  if (event.ticketFee !== undefined && event.ticketFee !== null && event.ticketFee !== 'free') {
    return Number(event.ticketFee) * (Number(quantity) || 1);
  }

  return 0;
}

module.exports = {
  calculateChargeFromBase,
  splitTotalIntoBaseAndFee,
  calculateTicketBaseAmount
};
