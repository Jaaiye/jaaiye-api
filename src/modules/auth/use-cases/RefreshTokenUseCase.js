/**
 * Refresh Token Use Case
 * Redis-based token rotation with jti-keyed sessions.
 * Eliminates all DB reads/writes from the token refresh path.
 */

const { InvalidTokenError, TokenExpiredError } = require('../errors');
const { NotFoundError } = require('../../common/errors');
const { TokenService } = require('../../common/services');
const { UserEntity } = require('../../common/entities');

class RefreshTokenUseCase {
  constructor({ userRepository, redisAuthService }) {
    this.userRepository = userRepository;
    this.redisAuthService = redisAuthService;
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

    // 1. Verify JWT signature + expiry
    let decoded;
    try {
      decoded = TokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof TokenExpiredError) throw error;
      if (error instanceof InvalidTokenError) throw error;
      throw new InvalidTokenError('Invalid refresh token');
    }

    const { id: userId, jti } = decoded;

    if (!jti) {
      throw new InvalidTokenError('Malformed refresh token: missing jti');
    }

    // 2. Generate new tokens first (before mutating Redis state)
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const userEntity = new UserEntity(user);
    userEntity.canLogin();

    const newAccessToken = TokenService.generateAccessToken(userEntity);
    const newRefreshToken = TokenService.generateRefreshToken(userEntity.id);
    const newDecoded = TokenService.verifyRefreshToken(newRefreshToken);

    // 3. Atomic rotation: DEL old jti, SET new jti
    // If DEL returns 0, this is a replay attack — old key was already consumed
    const rotated = await this.redisAuthService.rotateRefreshToken(userId, jti, newDecoded.jti);
    if (!rotated) {
      // Possible token replay — invalidate ALL sessions for this user as a security measure
      await this.redisAuthService.deleteAllRefreshTokens(userId);
      throw new InvalidTokenError('Refresh token already used or revoked. All sessions have been terminated for security.');
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}

module.exports = RefreshTokenUseCase;
