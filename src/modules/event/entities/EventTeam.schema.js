/**
 * Event Team Model
 * For ticketed events (category: 'event') - separate from EventParticipant which is for hangouts
 */

const mongoose = require('mongoose');

const eventTeamSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['creator', 'co_organizer', 'ticket_scanner'],
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  permissions: {
    editEvent: { type: Boolean, default: false },
    manageTickets: { type: Boolean, default: false },
    viewAnalytics: { type: Boolean, default: false },
    viewWallet: { type: Boolean, default: false },
    requestWithdrawal: { type: Boolean, default: false },
    checkInTickets: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
eventTeamSchema.index({ event: 1, user: 1 }, { unique: true });
eventTeamSchema.index({ user: 1, status: 1 });

// Set permissions based on role
eventTeamSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case 'creator':
        this.permissions = {
          editEvent: true,
          manageTickets: true,
          viewAnalytics: true,
          viewWallet: true,
          requestWithdrawal: true,
          checkInTickets: true
        };
        break;
      case 'co_organizer':
        this.permissions = {
          editEvent: true,
          manageTickets: true,
          viewAnalytics: true,
          viewWallet: true,
          requestWithdrawal: false,
          checkInTickets: true
        };
        break;
      case 'ticket_scanner':
        this.permissions = {
          editEvent: false,
          manageTickets: false,
          viewAnalytics: false,
          viewWallet: false,
          requestWithdrawal: false,
          checkInTickets: true
        };
        break;
    }
  }
  next();
});

module.exports = mongoose.models.EventTeam || mongoose.model('EventTeam', eventTeamSchema);

