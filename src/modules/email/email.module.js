/**
 * Email Module
 * Dependency Injection container for Email domain
 */

const EmailAdapter = require('./adapters/email.adapter');

class EmailModule {
  constructor() {
    this._instances = {};
  }

  getEmailAdapter() {
    if (!this._instances.emailAdapter) {
      this._instances.emailAdapter = new EmailAdapter();
    }
    return this._instances.emailAdapter;
  }
}

module.exports = new EmailModule();

