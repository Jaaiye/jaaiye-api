/**
 * PayoutScheduleService
 * Pure date calculation - no persistence, no DI dependencies.
 *
 * Mirrors the fixed cron schedule in payout-scheduler.queue.js (Thursday
 * 15:00 Africa/Lagos) so callers that just need "when is the next payout"
 * (e.g. a wallet summary endpoint) don't need to touch the scheduler
 * itself. Africa/Lagos is UTC+1 year-round with no DST, so this can do
 * plain fixed-offset arithmetic instead of pulling in a timezone library.
 */

const LAGOS_OFFSET_HOURS = 1;
const PAYOUT_DAY_OF_WEEK = 4; // Thursday (0 = Sunday)
const PAYOUT_HOUR_LAGOS = 15;

/**
 * @param {Date} [from] - defaults to now; exposed for testing
 * @returns {Date} the next Thursday 15:00 Africa/Lagos, as a UTC instant
 */
function getNextPayoutDate(from = new Date()) {
  const lagosNow = new Date(from.getTime() + LAGOS_OFFSET_HOURS * 60 * 60 * 1000);
  const dayOfWeek = lagosNow.getUTCDay();
  const hour = lagosNow.getUTCHours();

  let daysUntilPayout = (PAYOUT_DAY_OF_WEEK - dayOfWeek + 7) % 7;
  if (daysUntilPayout === 0 && hour >= PAYOUT_HOUR_LAGOS) {
    // Today is payout day but this week's run has already happened.
    daysUntilPayout = 7;
  }

  const nextPayoutLagos = new Date(lagosNow);
  nextPayoutLagos.setUTCDate(lagosNow.getUTCDate() + daysUntilPayout);
  nextPayoutLagos.setUTCHours(PAYOUT_HOUR_LAGOS, 0, 0, 0);

  return new Date(nextPayoutLagos.getTime() - LAGOS_OFFSET_HOURS * 60 * 60 * 1000);
}

module.exports = { getNextPayoutDate };
