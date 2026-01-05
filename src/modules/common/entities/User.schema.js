/**
 * User Mongoose Schema
 * Infrastructure layer - persistence
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      unique: true,
      trim: true
    },
    fullName: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: false, // Not required for OAuth users
      select: false
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'scanner', 'admin', 'superadmin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    profilePicture: {
      emoji: String,
      backgroundColor: String,
      url: String
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    googleCalendar: {
      googleId: String,
      refreshToken: { type: String, select: false },
      accessToken: { type: String, select: false },
      expiryDate: Date,
      scope: String,
      jaaiyeCalendarId: String,
      selectedCalendarIds: {
        type: [String],
        default: []
      },
      calendars: [{
        id: String,
        summary: String,
        resourceId: String,
        channelId: String
      }]
    },
    appleId: {
      type: String,
      sparse: true
    },
    verification: {
      code: { type: String, select: false },
      expires: { type: Date, select: false }
    },
    resetPassword: {
      code: { type: String, select: false },
      expires: { type: Date, select: false }
    },
    refresh: {
      token: { type: String, select: false },
      firebaseToken: { type: String, select: false },
      expiresAt: { type: Date, select: false }
    },
    friendSettings: {
      allowFriendRequests: { type: Boolean, default: true },
      allowEventInvites: { type: Boolean, default: true },
      visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'friends' }
    },
    ics: {
      token: { type: String, select: false }
    },
    deviceTokens: [{
      token: String,
      platform: { type: String, enum: ['ios', 'android', 'web'] },
      addedAt: { type: Date, default: Date.now }
    }],
    lastLogin: Date
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ 'googleCalendar.googleId': 1 });
userSchema.index({ appleId: 1 });
userSchema.index({ 'googleCalendar.calendars.resourceId': 1 });
userSchema.index({ 'ics.token': 1 });

// Export model (check if already compiled to avoid overwrite errors)
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
