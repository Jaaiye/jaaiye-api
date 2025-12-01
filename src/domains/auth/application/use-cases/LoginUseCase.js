/**
 * Login Use Case
 * Handles user login business logic
 */

const { InvalidCredentialsError } = require('../../domain/errors');
const { NotFoundError } = require('../../../shared/domain/errors');
const { PasswordService, TokenService } = require('../../../shared/domain/services');
const { UserEntity } = require('../../../shared/domain/entities');

class LoginUseCase {
  constructor({ userRepository, firebaseAdapter }) {
    this.userRepository = userRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  /**
   * Execute login
   * @param {LoginDTO} dto - Login data
   * @returns {Promise<Object>} { user, accessToken, refreshToken }
   */
  async execute(dto) {
    // Validate DTO
    const validation = dto.validate();
    if (!validation.valid) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    // Find user by email or username
    let user;
    if (dto.isEmail()) {
      user = await this.userRepository.findByEmail(dto.identifier);
    } else {
      user = await this.userRepository.findByUsername(dto.identifier);
    }

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    const isPasswordValid = await PasswordService.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    // Create user entity to check business rules
    const userEntity = new UserEntity(user);

    // Check if user can login (will throw if blocked or email not verified)
    userEntity.canLogin();

    // Generate tokens
    const accessToken = TokenService.generateAccessToken(userEntity);
    const refreshToken = TokenService.generateRefreshToken(userEntity.id);
    const firebaseToken = this.firebaseAdapter
      ? await this.firebaseAdapter.generateToken(userEntity.id)
      : null;

    // Save refresh token to user
    const refreshExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
    await this.userRepository.updateRefreshData(userEntity.id, {
      refreshToken,
      firebaseToken,
      refreshExpiry
    });


    return {
      user: userEntity,
      accessToken,
      refreshToken,
      firebaseToken
    };
  }
}

module.exports = LoginUseCase;

