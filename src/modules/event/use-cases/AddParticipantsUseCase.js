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
      userIds.map(userId => this.eventParticipantRepository.findByEventAndUser(eventId, userId))
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
      event: eventId,
      user: p.user,
      role: p.role
    }));

    const createdParticipants = await this.eventParticipantRepository.createMany(participantsData);

    // Send notifications
    await Promise.all(
      createdParticipants.map(participant =>
        this.notificationAdapter.send(participant.user, {
          title: 'Event Invitation',
          body: `You have been invited to the event "${event.title}"`
        }, {
          type: 'event_invitation',
          eventId: event.id,
          path: 'hangoutScreen'
        })
      )
    );

    // Add participants to associated group if event has one
    if (this.groupRepository) {
      try {
        const group = await this.groupRepository.findByEvent(eventId);
        if (group) {
          // Get existing group member IDs
          const existingMemberIds = new Set(
            group.members.map(m => {
              const memberUserId = typeof m.user === 'object' ? m.user.id || m.user._id : m.user;
              return memberUserId.toString();
            })
          );

          // Add only new participants to the group (filter out existing members)
          const participantUserIds = createdParticipants.map(p => {
            const participantUserId = typeof p.user === 'object' ? p.user.id || p.user._id : p.user;
            return participantUserId.toString();
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
                      const memberUser = await this.userRepository.findById(memberUserId);
                      if (memberUser) {
                        plainMembers[memberUserId.toString()] = {
                          name: String(memberUser.fullName || memberUser.username || 'Unknown User'),
                          avatar: String(memberUser.profilePicture || ''),
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

