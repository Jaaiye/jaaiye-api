/**
 * Group Mongoose Schema
 * Infrastructure layer - persistence
 */

const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [groupMemberSchema],
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    allowMemberEventCreation: {
      type: Boolean,
      default: true
    },
    defaultEventParticipation: {
      type: String,
      enum: ['auto_add', 'invite_only'],
      default: 'invite_only'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
groupSchema.index({ creator: 1, isActive: 1 });
groupSchema.index({ 'members.user': 1, isActive: 1 });
groupSchema.index({ name: 'text', description: 'text' });

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for event count
groupSchema.virtual('eventCount').get(function() {
  return this.events.length;
});

// Pre-save middleware to ensure creator is always an admin member
groupSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add creator as admin member
    this.members.push({
      user: this.creator,
      role: 'admin',
      joinedAt: new Date(),
      addedBy: this.creator
    });
  }
  next();
});

// Instance methods
groupSchema.methods.addMember = function(userId, addedByUserId, role = 'member') {
  const existingMember = this.members.find(member =>
    member.user.toString() === userId.toString()
  );

  if (existingMember) {
    throw new Error('User is already a member of this group');
  }

  this.members.push({
    user: userId,
    role,
    joinedAt: new Date(),
    addedBy: addedByUserId
  });

  return this.save();
};

groupSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(member =>
    member.user.toString() === userId.toString()
  );

  if (memberIndex === -1) {
    throw new Error('User is not a member of this group');
  }

  if (this.members[memberIndex].user.toString() === this.creator.toString()) {
    throw new Error('Cannot remove the group creator');
  }

  this.members.splice(memberIndex, 1);
  return this.save();
};

groupSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member =>
    member.user.toString() === userId.toString()
  );

  if (!member) {
    throw new Error('User is not a member of this group');
  }

  if (member.user.toString() === this.creator.toString()) {
    throw new Error('Cannot change the group creator\'s role');
  }

  member.role = newRole;
  return this.save();
};

groupSchema.methods.isMember = function(userId) {
  return this.members.some(member =>
    member.user.toString() === userId.toString()
  );
};

groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(member =>
    member.user.toString() === userId.toString()
  );
  return member && member.role === 'admin';
};

groupSchema.methods.canAddMembers = function(userId) {
  return this.settings.allowMemberInvites && this.isMember(userId);
};

groupSchema.methods.canCreateEvents = function(userId) {
  return this.settings.allowMemberEventCreation && this.isMember(userId);
};

groupSchema.methods.addEvent = function(eventId) {
  if (!this.events.includes(eventId)) {
    this.events.push(eventId);
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.removeEvent = function(eventId) {
  this.events = this.events.filter(id => id.toString() !== eventId.toString());
  return this.save();
};

// Static methods
groupSchema.statics.getUserGroups = function(userId, includeInactive = false) {
  const query = {
    'members.user': userId
  };

  if (!includeInactive) {
    query.isActive = true;
  }

  return this.find(query)
    .populate('creator', 'username fullName profilePicture')
    .populate('members.user', 'username fullName profilePicture')
    .populate('members.addedBy', 'username fullName')
    .populate('events', 'title startTime endTime location')
    .sort({ updatedAt: -1 });
};

groupSchema.statics.searchGroups = function(searchTerm, userId, limit = 20) {
  const searchRegex = new RegExp(searchTerm, 'i');

  return this.find({
    $and: [
      { isActive: true },
      { 'members.user': userId },
      {
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      }
    ]
  })
  .populate('creator', 'username fullName profilePicture')
  .populate('members.user', 'username fullName profilePicture')
  .limit(limit)
  .sort({ updatedAt: -1 });
};

groupSchema.statics.createFromEvent = async function(eventId, groupName, creatorId) {
  const EventSchema = require('../../../event/infrastructure/persistence/schemas/Event.schema');
  const EventParticipantSchema = require('../../../event/infrastructure/persistence/schemas/EventParticipant.schema');

  const event = await EventSchema.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Get event participants
  const participants = await EventParticipantSchema.find({ event: eventId }).populate('user');

  const group = new this({
    name: groupName,
    description: `Group created from event: ${event.title}`,
    creator: creatorId
  });

  await group.save();

  // Add all event participants as group members
  const participantPromises = participants.map(participant => {
    const userId = participant.user._id || participant.user;
    return group.addMember(userId, creatorId, 'member');
  });

  await Promise.all(participantPromises);
  await group.addEvent(eventId);

  return group;
};

// Export model (check if already compiled to avoid overwrite errors)
module.exports = mongoose.models.Group || mongoose.model('Group', groupSchema);

