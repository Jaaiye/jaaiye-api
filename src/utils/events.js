/**
 * Global Event Emitter
 * Used for cross-module communication to prevent circular dependencies.
 */

const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter { }

const appEventEmitter = new AppEventEmitter();

module.exports = appEventEmitter;
