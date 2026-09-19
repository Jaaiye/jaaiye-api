/**
 * Get My Wallet Activity Use Case
 * Application layer - merged recent-activity feed across every EVENT
 * wallet the requesting user owns as creator, for the global wallet
 * screen. Same creator-only scoping as GetMyWalletSummaryUseCase, for
 * the same reason: this money and its history only ever belongs to the
 * event's creator.
 */

class GetMyWalletActivityUseCase {
  constructor({ eventRepository, walletRepository, walletLedgerEntryRepository }) {
    this.eventRepository = eventRepository;
    this.walletRepository = walletRepository;
    this.walletLedgerEntryRepository = walletLedgerEntryRepository;
  }

  async execute(userId, { limit = 50, skip = 0 } = {}) {
    const { events } = await this.eventRepository.find(
      { creatorId: userId, category: 'event' },
      { limit: 500, sort: { createdAt: -1 } }
    );

    if (events.length === 0) {
      return { activity: [] };
    }

    const eventIds = events.map(e => e.id);
    const eventTitleById = new Map(events.map(e => [String(e.id), e.title]));

    const wallets = await this.walletRepository.findAllByOwnerIds('EVENT', eventIds);
    if (wallets.length === 0) {
      return { activity: [] };
    }

    const walletIds = wallets.map(w => w.id);
    const entries = await this.walletLedgerEntryRepository.findByWalletIds(walletIds, { limit, skip });

    const activity = entries.map(entry => ({
      id: entry.id,
      type: entry.type,
      direction: entry.direction,
      amount: entry.amount,
      eventId: entry.ownerId,
      eventTitle: eventTitleById.get(String(entry.ownerId)) || null,
      metadata: entry.metadata,
      createdAt: entry.createdAt
    }));

    return { activity };
  }
}

module.exports = GetMyWalletActivityUseCase;
