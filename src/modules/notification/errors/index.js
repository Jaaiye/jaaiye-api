const { AppError } = require('../../../../utils/errors');

class NotificationNotFoundError extends AppError {
  constructor(message = 'Notification not found') {
    super(message, 404);
    this.name = 'NotificationNotFoundError';
  }
}

module.exports = {
  NotificationNotFoundError
};

