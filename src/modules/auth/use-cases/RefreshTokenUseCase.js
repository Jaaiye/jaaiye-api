/**
 * Refresh Token Use Case
 * Handles token refresh using stored refresh token
 */

const { InvalidTokenError, TokenExpiredError } = require('../errors');
const { NotFoundError } = require('../../common/errors');
const { TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');

class RefreshTokenUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute token refresh
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} { accessToken, refreshToken }
   */
  async execute(refreshToken) {
    if (!refreshToken) {
      throw new InvalidTokenError('Refresh token is required');
    }

    // Verify refresh token JWT signature and expiration
    let decoded;
    try {
      decoded = TokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      // Preserve TokenExpiredError if that's what was thrown
      if (error instanceof TokenExpiredError) {
        throw error;
      }
      // Re-throw InvalidTokenError from TokenService
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      // Fallback for unexpected errors
      throw new InvalidTokenError('Invalid refresh token: verification failed');
    }

    // Find user with refresh token
    const user = await this.userRepository.findById(decoded.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if refresh token object exists
    if (!user.refresh) {
      const error = new InvalidTokenError('Refresh token not found in user record');
      if (process.env.NODE_ENV === 'development') {
        console.warn('Refresh token validation failed:', {
          userId: decoded.id,
          reason: 'refresh object missing',
          hasRefresh: !!user.refresh
        });
      }
      throw error;
    }

    // Check if refresh token matches stored token
    if (user.refresh.token !== refreshToken) {
      const error = new InvalidTokenError('Refresh token mismatch: token does not match stored value');
      if (process.env.NODE_ENV === 'development') {
        console.warn('Refresh token validation failed:', {
          userId: decoded.id,
          reason: 'token mismatch',
          hasStoredToken: !!user.refresh.token,
          storedTokenLength: user.refresh.token?.length,
          providedTokenLength: refreshToken?.length,
          tokensMatch: user.refresh.token === refreshToken
        });
      }
      throw error;
    }

    // Check if refresh token is expired (database expiry check)
    const { now, isBefore } = require('../../../utils/dateUtils');
    if (user.refresh.expiresAt && isBefore(user.refresh.expiresAt, now())) {
      throw new InvalidTokenError('Refresh token has expired');
    }

    // Create user entity
    const userEntity = new UserEntity(user);

    // Check if user can login (will throw if blocked)
    userEntity.canLogin();

    // Generate new tokens
    const newAccessToken = TokenService.generateAccessToken(userEntity);
    const newRefreshToken = TokenService.generateRefreshToken(userEntity.id);

    // Update refresh token in database
    const { addDaysToNow } = require('../../../utils/dateUtils');
    const refreshExpiry = addDaysToNow(90); // 90 days from now (UTC)
    await this.userRepository.update(userEntity.id, {
      'refresh.token': newRefreshToken,
      'refresh.expiresAt': refreshExpiry
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}

module.exports = RefreshTokenUseCase;

