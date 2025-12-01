/**
 * User Mongoose Schema
 * Canonical User model for both legacy and DDD code paths
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const providerProfileSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true },
    name: { type: String, trim: true },
    picture: { type: String, trim: true },
    lastSignInAt: { type: Date }
  },
  { _id: false }
);

const calendarMappingSchema = new mongoose.Schema(
  {
    googleCalendarId: { type: String, required: true },
    jaaiyeCalendarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Calendar' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const calendarSchema = new mongoose.Schema(
  {
    id: { type: String },
    syncToken: { type: String, select: false },
    channelId: { type: String, select: false },
    resourceId: { type: String, select: false },
    expiration: { type: Date }
  },
  { _id: false }
);

const deviceTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Invalid email format']
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    fullName: {
      type: String,
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters']
    },
    password: {
      type: String,
      select: false,
      minlength: [6, 'Password must be at least 6 characters']
    },
    refresh: {
      token: String,
      firebaseToken: String,
      expiresAt: Date
    },
    refreshToken: String,
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    appleId: {
      type: String,
      unique: true,
      sparse: true
    },
    providerLinks: {
      google: { type: Boolean, default: false },
      apple: { type: Boolean, default: false }
    },
    providerProfiles: {
      google: { type: providerProfileSchema, default: undefined },
      apple: { type: providerProfileSchema, default: undefined }
    },
    googleCalendar: {
      googleId: String,
      email: String,
      accessToken: { type: String, select: false },
      refreshToken: { type: String, select: false },
      tokenExpiry: Date,
      expiryDate: Date,
      scope: String,
      jaaiyeCalendarId: String,
      selectedCalendarIds: { type: [String], default: undefined },
      syncToken: { type: String, select: false },
      calendarMappings: { type: [calendarMappingSchema], default: [] },
      calendars: { type: [calendarSchema], default: [] }
    },
    ics: {
      token: { type: String, select: false }
    },
    profilePicture: {
      emoji: { type: String, default: '👤' },
      color: { type: String, default: '#000000' }
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    verification: {
      code: String,
      expires: Date
    },
    resetPassword: {
      code: String,
      expires: Date
    },
    lastLogin: Date,
    deleted: {
      status: { type: Boolean, default: false },
      date: { type: Date, default: null }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin', 'scanner'],
      default: 'user'
    },
    preferences: {
      notifications: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      }
    },
    friendSettings: {
      allowFriendRequests: { type: Boolean, default: true },
      allowRequestsFrom: {
        type: String,
        enum: ['everyone', 'friends_of_friends', 'nobody'],
        default: 'everyone'
      },
      showInSearch: { type: Boolean, default: true }
    },
    deviceTokens: { type: [deviceTokenSchema], default: [] }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      }
    }
  }
);

/**
 * Hooks & instance methods
 */
userSchema.pre('save', async function save(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.softDelete = function softDelete() {
  this.deleted.status = true;
  this.deleted.date = new Date();
  this.isActive = false;
  return this.save();
};

userSchema.methods.restore = function restore() {
  this.deleted.status = false;
  this.deleted.date = null;
  this.isActive = true;
  return this.save();
};

userSchema.methods.isSuperadmin = function isSuperadmin() {
  return this.role === 'superadmin';
};

userSchema.methods.isAdmin = function isAdmin() {
  return this.role === 'admin' || this.role === 'superadmin';
};

userSchema.statics.searchForFriends = function searchForFriends(searchTerm, requestingUserId, limit = 20) {
  const searchRegex = new RegExp(searchTerm, 'i');
  return this.find({
    $and: [
      { _id: { $ne: requestingUserId } },
      { isActive: true },
      { 'deleted.status': { $ne: true } },
      { 'friendSettings.showInSearch': true },
      {
        $or: [
          { username: searchRegex },
          { fullName: searchRegex },
          { email: searchRegex }
        ]
      }
    ]
  })
    .select('username fullName profilePicture email friendSettings')
    .limit(limit);
};

userSchema.query.notDeleted = function notDeleted() {
  return this.where({ 'deleted.status': { $ne: true } });
};

userSchema.query.active = function active() {
  return this.where({ isActive: true });
};

/**
 * Indexes
 */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ appleId: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ 'friendSettings.allowFriendRequests': 1 });
userSchema.index({ 'friendSettings.showInSearch': 1 });
userSchema.index({ 'friends.user': 1 });
userSchema.index({ 'googleCalendar.googleId': 1 }, { sparse: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

