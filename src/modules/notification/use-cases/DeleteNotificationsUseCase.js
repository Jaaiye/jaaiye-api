/**
 * Delete Notifications Use Case
 * Application layer - use case
 */

class DeleteNotificationsUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute(userId, dto) {
    const filter = dto.getFilter(userId);
    const deletedCount = await this.notificationRepository.deleteMany(filter);

    return {
      message: 'Notifications deleted',
      deletedCount
    };
  }
}

module.exports = DeleteNotificationsUseCase;

