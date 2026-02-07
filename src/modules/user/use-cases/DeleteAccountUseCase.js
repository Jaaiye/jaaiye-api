/**
 * Delete Account Use Case
 */
const { UserNotFoundError, InvalidPasswordError } = require('../../common/errors');
const { PasswordService } = require('../../common/services');

class DeleteAccountUseCase {
  constructor({ userRepository, emailAdapter }) {
    this.userRepository = userRepository;
    this.emailAdapter = emailAdapter;
  }

  async execute(userId, password) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundError();

    // Check if user is SSO (Google/Apple) or traditional
    const isSsoUser = user.googleId || user.appleId || !user.password;

    if (!isSsoUser) {
      if (!password) {
        throw new Error('Password is required to deactivate account');
      }

      const isMatch = await PasswordService.compare(password, user.password);
      if (!isMatch) throw new InvalidPasswordError('Invalid password');
    }

    // 1. Revoke sessions and blacklist tokens (Logic moved to Repository)
    await this.userRepository.revokeAllSessions(userId);

    // 2. Soft delete
    await this.userRepository.update(userId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });

    // 3. Background Email
    if (this.emailAdapter) {
      // NOTE: Better to inject the queue/service than require it here
      const { emailQueue } = require('../../../../queues');
      emailQueue.sendAccountDeactivationEmailAsync(user.email).catch(err => {
        console.error('Failed to send deactivation email:', err);
      });
    }
  }
}

module.exports = DeleteAccountUseCase;