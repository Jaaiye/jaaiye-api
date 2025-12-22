/**
 * Common Module (Shared Domain)
 * Dependency Injection container for shared/common components
 */

const UserRepository = require('./repositories/UserRepository');

class CommonModule {
  constructor() {
    this._userRepository = null;
  }

  getUserRepository() {
    if (!this._userRepository) {
      this._userRepository = new UserRepository();
    }
    return this._userRepository;
  }
}

module.exports = new CommonModule();

