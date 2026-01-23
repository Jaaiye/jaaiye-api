/**
 * Legacy Notification Model
 * Re-exports the DDD schema to prevent duplicate model registration
 */
// Notification Schema - migrated to modules structure
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'error', 'success', 'hangout_invitation', 'group_event_invitation', 'group_event_auto_added', 'event_invitation', 'team_invitation', 'event_removal', 'participant_status_update', 'group_member_added', 'group_member_removed', 'group_deleted', 'friend_request', 'friend_request_accepted', 'email_update', 'profile_update', 'logout', 'system', 'payment_success', 'payment_failed', 'ticket_sale'], default: 'info' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);