/**
 * Mark As Read Use Case
 * Application layer - use case
 */

class MarkAsReadUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute(userId, dto) {
    const filter = dto.getFilter(userId);
    const modifiedCount = await this.notificationRepository.updateMany(filter, { read: true });

    return {
      message: 'Notifications marked as read',
      modifiedCount
    };
  }
}

module.exports = MarkAsReadUseCase;

