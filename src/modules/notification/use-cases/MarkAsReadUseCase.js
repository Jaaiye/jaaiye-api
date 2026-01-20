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

    // Check how many notifications match BEFORE update
    const matchingCount = await this.notificationRepository.count(filter);

    // Check how many are already read
    const alreadyReadCount = await this.notificationRepository.count({
      ...filter,
      read: true
    });

    // Perform the update
    const modifiedCount = await this.notificationRepository.updateMany(filter, { read: true });

    return {
      message: 'Notifications marked as read',
      modifiedCount,
      totalMatching: matchingCount,
      alreadyRead: alreadyReadCount
    };
  }
}

module.exports = MarkAsReadUseCase;