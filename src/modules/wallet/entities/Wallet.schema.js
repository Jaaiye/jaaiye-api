/**
 * Wallet Mongoose Schema
 * Infrastructure layer - persistence model for wallets.
 */

const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  ownerType: {
    type: String,
    enum: ['EVENT', 'GROUP', 'PLATFORM'],
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function () {
      return this.ownerType !== 'PLATFORM';
    },
    index: true
  },
  balance: {
    // Use Decimal128 to emulate DECIMAL(18,2)-style precision
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    default: 0.0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

walletSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);


