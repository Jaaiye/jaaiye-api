/**
 * Infrastructure Adapters
 * Infrastructure layer - adapters exports
 */

const { NotificationAdapter, FirebaseAdapter, EmailAdapter } = require('../../../shared/infrastructure/adapters');

module.exports = {
  NotificationAdapter,
  FirebaseAdapter,
  EmailAdapter
};

