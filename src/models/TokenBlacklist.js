const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, expires: 0 } // Auto-delete when expiresAt passes
});

// Export model (check if already compiled to avoid overwrite errors)
module.exports = mongoose.models.TokenBlacklist || mongoose.model('TokenBlacklist', blacklistSchema);