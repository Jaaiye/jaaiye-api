/**
 * Shared Domain Container
 * Dependency Injection container for shared domain components
 */

const { UserRepository } = require('../infrastructure/persistence/repositories');

class SharedContainer {
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

module.exports = new SharedContainer();


