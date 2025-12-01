/**
 * Legacy compatibility layer
 * Re-exports the canonical DDD User schema/model so older modules
 * can continue using require('../models/User')
 */
module.exports = require('../domains/shared/infrastructure/persistence/schemas/User.schema');