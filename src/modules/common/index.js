/**
 * Common Module Exports
 * Central export point for all common/shared components
 */

module.exports = {
  // Module
  module: require('./common.module'),

  // Repositories
  repositories: require('./repositories'),

  // Entities
  entities: require('./entities'),

  // Services
  services: require('./services'),

  // Value Objects
  valueObjects: require('./value-objects'),

  // Errors
  errors: require('./errors'),

  // Repository Interfaces
  repositoryInterfaces: require('./repositories/interfaces')
};

