/**
 * Wallet Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');

class WalletController {
  constructor({
    getWalletDetailsUseCase,
    adjustWalletBalanceUseCase,
    requestWithdrawalWithPayoutUseCase,
    getWithdrawalsUseCase,
    getWithdrawalDetailsUseCase,
    walletAuthorizationService
  }) {
    this.getWalletDetailsUseCase = getWalletDetailsUseCase;
    this.adjustWalletBalanceUseCase = adjustWalletBalanceUseCase;
    this.requestWithdrawalWithPayoutUseCase = requestWithdrawalWithPayoutUseCase;
    this.getWithdrawalsUseCase = getWithdrawalsUseCase;
    this.getWithdrawalDetailsUseCase = getWithdrawalDetailsUseCase;
    this.walletAuthorizationService = walletAuthorizationService;
  }

  /**
   * Get wallet details (balance + ledger entries)
   * GET /api/v1/wallets/:ownerType/:ownerId
   */
  getWalletDetails = asyncHandler(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const userId = req.user.id || req.user._id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Normalize ownerType to uppercase
    const normalizedOwnerType = ownerType.toUpperCase();
    if (!['EVENT', 'GROUP', 'PLATFORM'].includes(normalizedOwnerType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ownerType. Must be EVENT, GROUP, or PLATFORM'
      });
    }

    // For PLATFORM wallet, ownerId should be null/undefined
    const finalOwnerId = normalizedOwnerType === 'PLATFORM' ? null : ownerId;

    // Authorization check
    const authResult = await this.walletAuthorizationService.canViewWallet({
      ownerType: normalizedOwnerType,
      ownerId: finalOwnerId,
      userId,
      isAdmin
    });

    if (!authResult.allowed) {
      return res.status(403).json({
        status: 'fail',
        message: authResult.reason || 'You do not have permission to view this wallet'
      });
    }

    const result = await this.getWalletDetailsUseCase.execute({
      ownerType: normalizedOwnerType,
      ownerId: authResult.resolvedOwnerId || finalOwnerId,
      userId,
      limit,
      skip
    });

    return successResponse(res, result);
  });

  /**
   * Get wallet ledger entries only
   * GET /api/v1/wallets/:ownerType/:ownerId/ledger
   */
  getWalletLedger = asyncHandler(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const userId = req.user.id || req.user._id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Normalize ownerType to uppercase
    const normalizedOwnerType = ownerType.toUpperCase();
    if (!['EVENT', 'GROUP', 'PLATFORM'].includes(normalizedOwnerType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ownerType. Must be EVENT, GROUP, or PLATFORM'
      });
    }

    // For PLATFORM wallet, ownerId should be null/undefined
    const finalOwnerId = normalizedOwnerType === 'PLATFORM' ? null : ownerId;

    // Authorization check
    const authResult = await this.walletAuthorizationService.canViewWallet({
      ownerType: normalizedOwnerType,
      ownerId: finalOwnerId,
      userId,
      isAdmin
    });

    if (!authResult.allowed) {
      return res.status(403).json({
        status: 'fail',
        message: authResult.reason || 'You do not have permission to view this wallet'
      });
    }

    const result = await this.getWalletDetailsUseCase.execute({
      ownerType: normalizedOwnerType,
      ownerId: authResult.resolvedOwnerId || finalOwnerId,
      userId,
      limit,
      skip
    });

    // Return only ledger entries
    return successResponse(res, {
      ledger: result.ledger || [],
      pagination: {
        limit,
        skip,
        total: result.ledger?.length || 0
      }
    });
  });

  /**
   * Adjust wallet balance (admin/superadmin only)
   * POST /api/v1/admin/wallets/:ownerType/:ownerId/adjust
   */
  adjustWalletBalance = asyncHandler(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { amount, reason } = req.body;
    const adjustedBy = req.user.id || req.user._id;

    // Normalize ownerType to uppercase
    const normalizedOwnerType = ownerType.toUpperCase();
    if (!['EVENT', 'GROUP', 'PLATFORM'].includes(normalizedOwnerType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ownerType. Must be EVENT, GROUP, or PLATFORM'
      });
    }

    // For PLATFORM wallet, ownerId should be null/undefined
    let finalOwnerId = normalizedOwnerType === 'PLATFORM' ? null : ownerId;

    // Resolve ownerId if it's a slug
    if (normalizedOwnerType !== 'PLATFORM') {
      const authResult = await this.walletAuthorizationService.canViewWallet({
        ownerType: normalizedOwnerType,
        ownerId: finalOwnerId,
        userId: adjustedBy,
        isAdmin: true
      });
      if (authResult.resolvedOwnerId) {
        finalOwnerId = authResult.resolvedOwnerId;
      }
    }

    const result = await this.adjustWalletBalanceUseCase.execute({
      ownerType: normalizedOwnerType,
      ownerId: finalOwnerId,
      amount: Number(amount),
      reason: reason || 'Manual adjustment',
      adjustedBy
    });

    return successResponse(res, result, 200, 'Wallet balance adjusted successfully');
  });

  /**
   * Request withdrawal with payout
   * POST /api/v1/wallets/:ownerType/:ownerId/withdraw
   */
  requestWithdrawal = asyncHandler(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { amount, bankAccountId } = req.body;
    const requestedBy = req.user.id || req.user._id;

    // Normalize ownerType to uppercase
    const normalizedOwnerType = ownerType.toUpperCase();
    if (!['EVENT', 'GROUP'].includes(normalizedOwnerType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ownerType. Must be EVENT or GROUP'
      });
    }

    // Authorization check
    const authResult = await this.walletAuthorizationService.canWithdrawFromWallet({
      ownerType: normalizedOwnerType,
      ownerId,
      userId: requestedBy
    });

    if (!authResult.allowed) {
      return res.status(403).json({
        status: 'fail',
        message: authResult.reason || 'You do not have permission to withdraw from this wallet'
      });
    }

    const result = await this.requestWithdrawalWithPayoutUseCase.execute({
      ownerType: normalizedOwnerType,
      ownerId: authResult.resolvedOwnerId || ownerId,
      requestedBy,
      amount: Number(amount),
      bankAccountId: bankAccountId || null
    });

    return successResponse(res, result, 200, 'Withdrawal request submitted successfully');
  });

  /**
   * Get withdrawals for a wallet
   * GET /api/v1/wallets/:ownerType/:ownerId/withdrawals
   */
  getWalletWithdrawals = asyncHandler(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const userId = req.user.id || req.user._id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    const normalizedOwnerType = ownerType.toUpperCase();
    if (!['EVENT', 'GROUP'].includes(normalizedOwnerType)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ownerType. Must be EVENT or GROUP'
      });
    }

    // Authorization check
    const authResult = await this.walletAuthorizationService.canViewWallet({
      ownerType: normalizedOwnerType,
      ownerId,
      userId,
      isAdmin
    });

    if (!authResult.allowed) {
      return res.status(403).json({
        status: 'fail',
        message: authResult.reason || 'You do not have permission to view this wallet'
      });
    }

    const result = await this.getWithdrawalsUseCase.executeByWallet({
      ownerType: normalizedOwnerType,
      ownerId: authResult.resolvedOwnerId || ownerId,
      limit,
      skip
    });

    return successResponse(res, result);
  });

  /**
   * Get user's withdrawals
   * GET /api/v1/users/withdrawals
   */
  getUserWithdrawals = asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const result = await this.getWithdrawalsUseCase.executeByUser({
      userId,
      limit,
      skip
    });

    return successResponse(res, result);
  });

  /**
   * Get withdrawal details
   * GET /api/v1/wallets/withdrawals/:withdrawalId
   */
  getWithdrawalDetails = asyncHandler(async (req, res) => {
    const { withdrawalId } = req.params;
    const userId = req.user.id || req.user._id;

    const result = await this.getWithdrawalDetailsUseCase.execute({
      withdrawalId,
      userId
    });

    return successResponse(res, { withdrawal: result });
  });
}

module.exports = WalletController;

