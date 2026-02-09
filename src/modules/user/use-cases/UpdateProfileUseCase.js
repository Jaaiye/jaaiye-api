/**
 * Update Profile Use Case
 * Application layer - use case
 */

const { ProfilePicture } = require('../../common/value-objects');
const { UserNotFoundError, UsernameTakenError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');

class UpdateProfileUseCase {
  constructor({ userRepository, notificationAdapter }) {
    this.userRepository = userRepository;
    this.notificationAdapter = notificationAdapter;
  }

  /**
   * Execute update profile
   * @param {string} userId - User ID
   * @param {UpdateProfileDTO} dto - Update profile DTO
   * @returns {Promise<Object>} Updated user
   */
  async execute(userId, dto) {
    dto.validate();

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const updates = {};

    // Check username availability if changing
    if (dto.username && dto.username !== user.username) {
      const usernameExists = await this.userRepository.usernameExists(dto.username);
      if (usernameExists) {
        throw new UsernameTakenError();
      }
      updates.username = dto.username;
    }

    // Update full name
    if (dto.fullName !== undefined) {
      updates.fullName = dto.fullName;
    }

    // Update preferences
    if (dto.preferences !== undefined) {
      updates.preferences = dto.preferences;
    }

    // Update profile picture (emoji + color)
    if (dto.emoji && dto.color) {
      const profilePicture = new ProfilePicture({ emoji: dto.emoji, color: dto.color });
      updates.profilePicture = profilePicture.toJSON();
    }

    // Apply updates
    const updatedUser = await this.userRepository.update(userId, updates);

    // Send notification in background (non-blocking)
    if (this.notificationAdapter) {
      this.notificationAdapter.send(userId, {
        title: 'Profile Updated',
        body: 'Your profile has been updated',
        data: { type: 'profile_update' }
      }).catch(err => {
        console.error('Failed to send notification:', err);
      });
    }

    // Return user data matching legacy format (formatUserResponse will handle formatting)
    return {
      user: {
        _id: updatedUser.id, // formatUserResponse expects _id
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
        profilePicture: updatedUser.profilePicture,
        preferences: updatedUser.preferences,
        isActive: updatedUser.isActive,
        isBlocked: updatedUser.isBlocked,
        createdAt: updatedUser.createdAt,
        isGoogle: !!(updatedUser.googleCalendar && updatedUser.googleCalendar.googleId),
        isApple: !!updatedUser.appleId,
        isGoogleCalendarLinked: !!(updatedUser.googleCalendar && updatedUser.googleCalendar.refreshToken)
      }
    };
  }
}

module.exports = UpdateProfileUseCase;

