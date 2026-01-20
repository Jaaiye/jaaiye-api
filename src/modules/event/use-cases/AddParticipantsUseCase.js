/**
 * Add Participants Use Case
 * Application layer - use case
 * Handles both single and multiple participants
 */

const { EventNotFoundError, EventAccessDeniedError, ParticipantAlreadyExistsError } = require('../errors');

class AddParticipantsUseCase {
  constructor({
    eventRepository,
    calendarRepository,
    eventParticipantRepository,
    userRepository,
    notificationAdapter,
    googleCalendarAdapter,
    calendarSyncService,
    groupRepository,
    firebaseAdapter
  }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.userRepository = userRepository;
    this.notificationAdapter = notificationAdapter;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.calendarSyncService = calendarSyncService;
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  async execute(eventId, userId, dto) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(eventId);
    let event;

    if (isObjectId) {
      event = await this.eventRepository.findById(eventId);
    } else {
      event = await this.eventRepository.findBySlug(eventId);
    }

    if (!event) {
      throw new EventNotFoundError();
    }

    // Check access
    const calendar = await this.calendarRepository.findById(event.calendar);
    if (!calendar) {
      throw new EventNotFoundError();
    }

    if (!calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId)) {
      throw new EventAccessDeniedError('You do not have permission to add participants to this event');
    }

    // Normalize participants
    const normalizedParticipants = dto.normalize();

    // Check for existing participants
    const userIds = normalizedParticipants.map(p => p.user);
    const existingParticipants = await Promise.all(
      userIds.map(userId => this.eventParticipantRepository.findByEventAndUser(event._id || event.id, userId))
    );

    const existingUserIds = new Set(
      existingParticipants.filter(p => p !== null).map(p => p.user.toString())
    );

    // Filter out existing participants
    const newParticipants = normalizedParticipants.filter(
      p => !existingUserIds.has(p.user.toString())
    );

    if (newParticipants.length === 0) {
      throw new ParticipantAlreadyExistsError('All users are already participants');
    }

    // Create participants
    const participantsData = newParticipants.map(p => ({
      event: event._id || event.id,
      user: p.user,
      role: p.role
    }));

    const createdParticipants = await this.eventParticipantRepository.createMany(participantsData);

    // Filter participants for notification (exclude initiator and ensure uniqueness)
    const initiatorId = userId?.toString ? userId.toString() : String(userId);
    const uniqueParticipantsToNotify = [];
    const notifiedUserIds = new Set();

    createdParticipants.forEach(participant => {
      const participantUserId = participant.user?.toString ? participant.user.toString() : String(participant.user);
      if (participantUserId !== initiatorId && !notifiedUserIds.has(participantUserId)) {
        uniqueParticipantsToNotify.push(participant);
        notifiedUserIds.add(participantUserId);
      }
    });

    // Send notifications
    await Promise.all(
      uniqueParticipantsToNotify.map(participant =>
        this.notificationAdapter.send(participant.user, {
          title: 'Hangout Invitation',
          body: `You have been invited to the hangout "${event.title}"`
        }, {
          type: 'hangout_invitation',
          eventId: event._id || event.id,
          path: 'hangoutPreviewScreen'
        })
      )
    );

    // Add participants to associated group if event has one
    if (this.groupRepository) {
      try {
        const group = await this.groupRepository.findByEvent(event._id || event.id);
        if (group) {
          // Get existing group member IDs (ensure they are strings)
          const existingMemberIds = new Set(
            group.members.map(m => {
              const u = m.user;
              if (!u) return '';
              // Handle populated vs non-populated
              const id = typeof u === 'object' ? (u.id || u._id || u) : u;
              if (typeof id === 'string') return id;
              if (id.toHexString) return id.toHexString();
              if (Buffer.isBuffer(id)) return id.toString('hex');
              return String(id);
            })
          );

          // Add only new participants to the group (filter out existing members)
          const participantUserIds = createdParticipants.map(p => {
            const u = p.user;
            if (!u) return '';
            const id = typeof u === 'object' ? (u.id || u._id || u) : u;
            if (typeof id === 'string') return id;
            if (id.toHexString) return id.toHexString();
            if (Buffer.isBuffer(id)) return id.toString('hex');
            return String(id);
          });

          const newParticipantIds = participantUserIds.filter(id => !existingMemberIds.has(id));

          if (newParticipantIds.length > 0) {
            await Promise.all(
              newParticipantIds.map(async (participantUserId) => {
                try {
                  await this.groupRepository.addMember(group.id, participantUserId, userId, 'member');
                } catch (error) {
                  console.warn(`Failed to add participant ${participantUserId} to group:`, error.message);
                }
              })
            );

            // Sync group members to Firebase (non-blocking)
            if (this.firebaseAdapter) {
              setImmediate(async () => {
                try {
                  // Get updated group with all members
                  const updatedGroup = await this.groupRepository.findById(group.id);

                  // Build members object for Firebase
                  const plainMembers = {};
                  for (const member of updatedGroup.members) {
                    if (member.user) {
                      const memberUserId = typeof member.user === 'object' ? member.user.id || member.user._id : member.user;
                      const memberUserIdStr = memberUserId?.toString ? memberUserId.toString() : String(memberUserId);
                      const memberUser = await this.userRepository.findById(memberUserId);
                      if (memberUser) {
                        plainMembers[memberUserIdStr] = {
                          name: String(memberUser.fullName || memberUser.username || 'Unknown User'),
                          avatar: memberUser.profilePicture || '',
                          role: String(member.role || 'member')
                        };
                      }
                    }
                  }

                  await this.firebaseAdapter.updateGroup(updatedGroup.id, {
                    members: plainMembers
                  });
                } catch (error) {
                  console.error('[AddParticipants] Failed to sync group to Firebase:', error);
                }
              });
            }
          }
        }
      } catch (error) {
        // Log but don't fail participant addition if group operation fails
        console.warn('[AddParticipants] Failed to add participants to group:', error.message);
      }
    }

    // Sync event to participants' calendars (Jaaiye + Google) - non-blocking
    if (this.calendarSyncService) {
      const participantUserIds = createdParticipants.map(p =>
        p.user?.toString ? p.user.toString() : String(p.user)
      );

      this.calendarSyncService.syncEventToMultipleUsers(participantUserIds, event, {
        skipGoogle: false // Sync to Google for participants
      }).catch(error => {
        console.warn('[AddParticipants] Calendar sync failed:', error);
      });
    } else {
      // Fallback: Direct Google sync (legacy behavior) - non-blocking
      setImmediate(async () => {
        await Promise.all(
          createdParticipants.map(async (participant) => {
            try {
              const participantUser = await this.userRepository.findById(participant.user);
              if (participantUser && participantUser.providerLinks?.google && participantUser.googleCalendar?.refreshToken) {
                const eventBody = {
                  summary: event.title,
                  description: event.description || `You've been invited to ${event.title}`,
                  start: { dateTime: new Date(event.startTime).toISOString() },
                  end: { dateTime: new Date(event.endTime || event.startTime).toISOString() },
                  location: event.venue || undefined
                };

                await this.googleCalendarAdapter.insertEvent(participantUser, eventBody);
              }
            } catch (error) {
              console.warn('Failed to add event to participant Google Calendar', error);
            }
          })
        );
      });
    }

    return createdParticipants.map(p => p.toJSON());
  }
}

module.exports = AddParticipantsUseCase;

