/**
 * Get My Wallet Summary Use Case
 * Application layer - aggregate wallet balance/held-for-payout across
 * every event the requesting user created, for the home screen summary.
 * Only creator-owned events count, since payouts only ever go to the
 * event creator's own bank account (ProcessScheduledPayoutsUseCase) -
 * co-organizer/scanner permissions don't make that money theirs.
 */

const { getNextPayoutDate } = require('../services/PayoutScheduleService');

class GetMyWalletSummaryUseCase {
  constructor({ eventRepository, walletRepository }) {
    this.eventRepository = eventRepository;
    this.walletRepository = walletRepository;
  }

  async execute(userId) {
    const { events } = await this.eventRepository.find(
      { creatorId: userId, category: 'event' },
      { limit: 500, sort: { createdAt: -1 } }
    );

    if (events.length === 0) {
      return {
        balance: 0,
        heldForPayout: 0,
        currency: 'NGN',
        nextPayoutDate: getNextPayoutDate(),
        eventCount: 0,
        events: []
      };
    }

    const eventIds = events.map(e => e.id);
    const wallets = await this.walletRepository.findAllByOwnerIds('EVENT', eventIds);
    const walletByEventId = new Map(wallets.map(w => [String(w.ownerId), w]));

    const totals = wallets.reduce(
      (acc, wallet) => {
        acc.balance += Number(wallet.balance);
        acc.heldForPayout += Number(wallet.heldForPayout);
        return acc;
      },
      { balance: 0, heldForPayout: 0 }
    );

    // Per-event breakdown - read-only display in the global wallet screen
    // ("which of my events contributed what"), not a withdrawal target.
    // Events with no wallet yet (never had a sale) show as zero rather
    // than being omitted, so the list matches "events you host" exactly.
    const eventBreakdown = events.map(event => {
      const wallet = walletByEventId.get(String(event.id));
      return {
        eventId: event.id,
        title: event.title,
        balance: wallet ? Number(wallet.balance) : 0,
        heldForPayout: wallet ? Number(wallet.heldForPayout) : 0
      };
    });

    return {
      balance: totals.balance,
      heldForPayout: totals.heldForPayout,
      currency: 'NGN',
      nextPayoutDate: getNextPayoutDate(),
      eventCount: events.length,
      events: eventBreakdown
    };
  }
}

module.exports = GetMyWalletSummaryUseCase;
