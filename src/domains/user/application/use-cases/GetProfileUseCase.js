/**
 * Get Profile Use Case
 * Application layer - use case
 */

const { UserEntity } = require('../../../shared/domain/entities');
const { UserNotFoundError } = require('../../../shared/domain/errors');

class GetProfileUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Execute get profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile
   */
  async execute(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    // Check if Google Calendar is linked
    const UserSchema = require('../../../shared/infrastructure/persistence/schemas/User.schema');
    const userDoc = await UserSchema.findById(userId).select('+googleCalendar.refreshToken');
    const isGoogleCalendarLinked = !!(userDoc?.googleCalendar?.refreshToken);

    // Return user data matching legacy format (formatUserResponse will handle formatting)
    return {
      user: {
        _id: user.id, // formatUserResponse expects _id
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        profilePicture: user.profilePicture,
        preferences: user.preferences,
        isActive: user.isActive,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        isGoogleCalendarLinked
      }
    };
  }
}

module.exports = GetProfileUseCase;

