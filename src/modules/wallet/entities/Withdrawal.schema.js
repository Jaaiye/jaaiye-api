const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },
  ownerType: {
    type: String,
    enum: ['EVENT', 'GROUP'],
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  feeAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'successful', 'failed'],
    default: 'pending',
    index: true
  },
  payoutReference: {
    type: String,
    index: true
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

withdrawalSchema.index({ ownerType: 1, ownerId: 1, status: 1 });
withdrawalSchema.index({ payoutReference: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Withdrawal || mongoose.model('Withdrawal', withdrawalSchema);

