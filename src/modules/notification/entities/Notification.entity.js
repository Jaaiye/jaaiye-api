/**
 * Notification Domain Entity
 * Pure business logic, framework-agnostic
 */

class NotificationEntity {
  constructor({
    id,
    user,
    title,
    message,
    type,
    data = {},
    read = false,
    priority = 'medium',
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.user = user;
    this.title = title;
    this.message = message;
    this.type = type;
    this.data = data;
    this.read = read;
    this.priority = priority;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Business Rule: Is notification read?
   * @returns {boolean}
   */
  isRead() {
    return this.read === true;
  }

  /**
   * Business Rule: Is notification unread?
   * @returns {boolean}
   */
  isUnread() {
    return this.read === false;
  }

  /**
   * Business Rule: Mark as read
   */
  markAsRead() {
    this.read = true;
  }

  /**
   * Business Rule: Mark as unread
   */
  markAsUnread() {
    this.read = false;
  }

  /**
   * Business Rule: Is high priority?
   * @returns {boolean}
   */
  isHighPriority() {
    return this.priority === 'high';
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      user: this.user,
      title: this.title,
      message: this.message,
      type: this.type,
      data: this.data,
      read: this.read,
      priority: this.priority,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = NotificationEntity;

