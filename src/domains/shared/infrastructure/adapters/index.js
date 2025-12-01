/**
 * Infrastructure Adapters
 * Shared domain - adapters exports
 */

const FirebaseAdapter = require('./FirebaseAdapter');
const EmailAdapter = require('./EmailAdapter');
const NotificationAdapter = require('./NotificationAdapter');

module.exports = {
  FirebaseAdapter,
  EmailAdapter,
  NotificationAdapter
};

