/**
 * Get Notifications Use Case
 * Application layer - use case
 */

class GetNotificationsUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute(userId, dto) {
    const filters = dto.getFilters();
    const options = dto.getOptions();

    const { notifications, total } = await this.notificationRepository.findByUser(userId, filters, options);

    return {
      notifications: notifications.map(n => n.toJSON()),
      total,
      page: dto.page,
      pages: Math.ceil(total / dto.limit)
    };
  }
}

module.exports = GetNotificationsUseCase;

