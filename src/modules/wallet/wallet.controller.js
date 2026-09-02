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
   * @swagger
   * /wallets/{ownerType}/{ownerId}:
   *   get:
   *     summary: Get wallet details
   *     tags: [Wallet]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ownerType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [EVENT, GROUP, PLATFORM]
   *       - in: path
   *         name: ownerId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Wallet details
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
   * @swagger
   * /wallets/{ownerType}/{ownerId}/ledger:
   *   get:
   *     summary: Get wallet ledger
   *     tags: [Wallet]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ownerType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [EVENT, GROUP, PLATFORM]
   *       - in: path
   *         name: ownerId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Ledger entries
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
   * @swagger
   * /admin/wallets/{ownerType}/{ownerId}/adjust:
   *   post:
   *     summary: Adjust wallet balance (Admin)
   *     tags: [Wallet]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ownerType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [EVENT, GROUP, PLATFORM]
   *       - in: path
   *         name: ownerId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [amount, reason]
   *             properties:
   *               amount:
   *                 type: number
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Adjusted
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
   * @swagger
   * /wallets/{ownerType}/{ownerId}/withdraw:
   *   post:
   *     summary: Request withdrawal
   *     tags: [Wallet]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ownerType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [EVENT, GROUP]
   *       - in: path
   *         name: ownerId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [amount]
   *             properties:
   *               amount:
   *                 type: number
   *               bankAccountId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Withdrawal requested
   */
  requestWithdrawal = asyncHandler(async (req, res) => {
    const { ownerType, ownerId } = req.params;
    const { amount, bankAccountId } = req.body;
    const requestedBy = req.user.id || req.user._id;
    // This route is admin-gated (see wallet.routes.js) - every caller here
    // is already an admin, using this as a manual override. Ownership is
    // not required in that case.
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

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
      userId: requestedBy,
      isAdmin
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
      bankAccountId: bankAccountId || null,
      isAdmin
    });

    return successResponse(res, result, 200, 'Withdrawal request submitted successfully');
  });

  /**
   * @swagger
   * /wallets/{ownerType}/{ownerId}/withdrawals:
   *   get:
   *     summary: Get wallet withdrawals
   *     tags: [Wallet]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ownerType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [EVENT, GROUP]
   *       - in: path
   *         name: ownerId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of withdrawals
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
   * @swagger
   * /wallets/withdrawals/{withdrawalId}:
   *   get:
   *     summary: Get withdrawal detail
   *     tags: [Wallet]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: withdrawalId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Withdrawal details
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

