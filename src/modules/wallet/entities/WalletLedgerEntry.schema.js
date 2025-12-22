/**
 * Wallet Ledger Entry Mongoose Schema
 * Infrastructure layer - persistence model for wallet ledger entries.
 */

const mongoose = require('mongoose');

const walletLedgerEntrySchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['FUNDING', 'WITHDRAWAL', 'FEE', 'ADJUSTMENT'],
    required: true,
    index: true
  },
  direction: {
    type: String,
    enum: ['CREDIT', 'DEBIT'],
    required: true
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  balanceAfter: {
    type: mongoose.Schema.Types.Decimal128,
    required: false
  },
  ownerType: {
    type: String,
    enum: ['EVENT', 'GROUP', 'PLATFORM'],
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    index: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: false,
    index: true
  },
  hangoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: false,
    index: true
  },
  externalReference: {
    type: String,
    required: false,
    index: true
  },
  metadata: {
    type: Object,
    required: false,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

walletLedgerEntrySchema.index({ walletId: 1, createdAt: -1 });

module.exports = mongoose.models.WalletLedgerEntry || mongoose.model('WalletLedgerEntry', walletLedgerEntrySchema);


