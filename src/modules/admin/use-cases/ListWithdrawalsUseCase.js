/**
 * List Withdrawals Use Case
 * Application layer - admin-only: list all withdrawals with filters
 */

class ListWithdrawalsUseCase {
  constructor({ withdrawalRepository, userRepository, walletRepository }) {
    this.withdrawalRepository = withdrawalRepository;
    this.userRepository = userRepository;
    this.walletRepository = walletRepository;
  }

  /**
   * List all withdrawals with optional filters
   *
   * @param {Object} params
   * @param {string} [params.status] - Filter by status: 'pending', 'successful', 'failed'
   * @param {string} [params.ownerType] - Filter by ownerType: 'EVENT', 'GROUP'
   * @param {string} [params.userId] - Filter by user ID
   * @param {number} [params.limit=50] - Pagination limit
   * @param {number} [params.skip=0] - Pagination skip
   * @param {string} [params.sort='createdAt'] - Sort field
   * @param {number} [params.sortOrder=-1] - Sort order (-1 for desc, 1 for asc)
   */
  async execute({ status, ownerType, userId, limit = 50, skip = 0, sort = 'createdAt', sortOrder = -1 }) {
    const query = {};

    if (status) {
      if (!['pending', 'successful', 'failed'].includes(status)) {
        throw new Error('Invalid status. Must be pending, successful, or failed');
      }
      query.status = status;
    }

    if (ownerType) {
      if (!['EVENT', 'GROUP'].includes(ownerType.toUpperCase())) {
        throw new Error('Invalid ownerType. Must be EVENT or GROUP');
      }
      query.ownerType = ownerType.toUpperCase();
    }

    if (userId) {
      query.user = userId;
    }

    const sortObj = {};
    sortObj[sort] = sortOrder === 1 ? 1 : -1;

    // Get withdrawals with pagination
    const withdrawals = await this.withdrawalRepository.findByQuery(query, {
      limit: Math.min(limit, 100), // Cap at 100
      skip,
      sort: sortObj
    });

    // Get total count for pagination
    const total = await this.withdrawalRepository.countByQuery(query);

    // Enrich with user and wallet info (optional, can be done in batches)
    const enrichedWithdrawals = await Promise.all(
      withdrawals.map(async (w) => {
        let user = null;
        let wallet = null;

        try {
          [user, wallet] = await Promise.all([
            this.userRepository.findById(w.user),
            this.walletRepository.findById(w.wallet)
          ]);
        } catch (err) {
          // Continue even if enrichment fails
        }

        return {
          id: w._id || w.id,
          ownerType: w.ownerType,
          ownerId: w.ownerId,
          amount: w.amount,
          feeAmount: w.feeAmount,
          status: w.status,
          payoutReference: w.payoutReference,
          user: user ? {
            id: user.id || user._id,
            email: user.email,
            fullName: user.fullName,
            username: user.username
          } : { id: w.user },
          wallet: wallet ? {
            id: wallet.id || wallet._id,
            balance: Number(wallet.balance || 0)
          } : { id: w.wallet },
          metadata: w.metadata || {},
          createdAt: w.createdAt,
          updatedAt: w.updatedAt
        };
      })
    );

    return {
      withdrawals: enrichedWithdrawals,
      pagination: {
        total,
        limit: Math.min(limit, 100),
        skip,
        hasMore: skip + enrichedWithdrawals.length < total
      }
    };
  }
}

module.exports = ListWithdrawalsUseCase;

