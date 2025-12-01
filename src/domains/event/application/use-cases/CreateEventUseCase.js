/**
 * Create Event Use Case
 * Application layer - use case
 */

const { ValidationError, NotFoundError } = require('../../../shared/domain/errors');
const { EventNotFoundError } = require('../../domain/errors');

class CreateEventUseCase {
  constructor({
    eventRepository,
    calendarRepository,
    userRepository,
    eventParticipantRepository,
    cloudinaryAdapter,
    googleCalendarAdapter,
    notificationAdapter,
    groupRepository,
    firebaseAdapter
  }) {
    this.eventRepository = eventRepository;
    this.calendarRepository = calendarRepository;
    this.userRepository = userRepository;
    this.eventParticipantRepository = eventParticipantRepository;
    this.cloudinaryAdapter = cloudinaryAdapter;
    this.googleCalendarAdapter = googleCalendarAdapter;
    this.notificationAdapter = notificationAdapter;
    this.groupRepository = groupRepository;
    this.firebaseAdapter = firebaseAdapter;
  }

  async execute(userId, dto, file = null) {
    // Resolve calendar
    let calendar;
    if (dto.calendarId) {
      calendar = await this.calendarRepository.findById(dto.calendarId);
      if (!calendar) {
        throw new NotFoundError('Calendar not found');
      }
      // Check access
      if (!calendar.isOwnedBy(userId) && !calendar.isSharedWith(userId) && !calendar.isPublic) {
        throw new Error('Access denied to calendar');
      }
    } else {
      calendar = await this.calendarRepository.findByOwner(userId);
      if (!calendar) {
        throw new NotFoundError('No calendar found for user');
      }
    }

    // Normalize dates
    const startTime = new Date(dto.startTime);
    if (isNaN(startTime.getTime())) {
      throw new ValidationError('Start time must be a valid date');
    }

    const endTime = dto.endTime ? new Date(dto.endTime) : new Date(startTime.getTime() + 8 * 60 * 60 * 1000);
    if (isNaN(endTime.getTime())) {
      throw new ValidationError('End time must be a valid date');
    }

    if (endTime < startTime) {
      throw new ValidationError('End time must be after start time');
    }

    const now = new Date();
    if (startTime < now) {
      throw new ValidationError('Start time cannot be in the past');
    }

    // Normalize category
    const category = dto.category ? String(dto.category).toLowerCase() : 'hangout';
    if (!['hangout', 'event'].includes(category)) {
      throw new ValidationError('Category must be either "hangout" or "event"');
    }

    // Normalize ticket types
    let ticketTypes = [];
    if (category === 'event' && Array.isArray(dto.ticketTypes)) {
      ticketTypes = dto.ticketTypes.map(type => ({
        name: type.name,
        description: type.description,
        price: type.price === undefined || type.price === null || type.price === '' ? 0 : Number(type.price),
        capacity: type.capacity === undefined || type.capacity === null || type.capacity === '' ? null : Number(type.capacity),
        soldCount: 0,
        isActive: type.isActive === undefined ? true : Boolean(type.isActive),
        salesStartDate: type.salesStartDate ? new Date(type.salesStartDate) : null,
        salesEndDate: type.salesEndDate ? new Date(type.salesEndDate) : null
      }));
    }

    // Normalize ticket fee
    let ticketFee = null;
    if (category === 'hangout') {
      if (dto.ticketFee || ticketTypes.length > 0) {
        throw new ValidationError('Hangouts cannot include tickets');
      }
    } else {
      if (!dto.ticketFee && ticketTypes.length === 0) {
        throw new ValidationError('Events require ticket information');
      }
      if (dto.ticketFee === 'free') {
        ticketFee = 'free';
      } else if (dto.ticketFee !== undefined && dto.ticketFee !== null && dto.ticketFee !== '') {
        const numericFee = Number(dto.ticketFee);
        if (isNaN(numericFee) || numericFee < 0) {
          throw new ValidationError('ticketFee must be a non-negative number or "free"');
        }
        ticketFee = numericFee;
      }
    }

    // Upload image
    let imageUrl = null;
    if (file) {
      try {
        imageUrl = await this.cloudinaryAdapter.uploadImage(file.buffer);
      } catch (error) {
        throw new ValidationError(`Failed to upload image: ${error.message}`);
      }
    }

    // Fetch user to check role and for Google Calendar sync
    const user = await this.userRepository.findById(userId);

    // Determine createdBy - if user is admin/superadmin, use "Jaaiye"
    let createdBy = userId;
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      createdBy = 'Jaaiye';
    }

    // Create event
    const event = await this.eventRepository.create({
      calendar: calendar.id,
      title: dto.title,
      description: dto.description,
      startTime,
      endTime,
      venue: dto.venue,
      category,
      ticketFee,
      ticketTypes,
      isAllDay: dto.isAllDay || false,
      recurrence: dto.recurrence,
      image: imageUrl,
      createdBy
    });

    // Sync with Google Calendar
    try {
      if (user && user.providerLinks?.google && user.googleCalendar?.refreshToken) {
        const targetGoogleCalId = dto.googleCalendarId || calendar.google?.primaryId || user.googleCalendar?.jaaiyeCalendarId;
        if (targetGoogleCalId) {
          const eventBody = {
            summary: event.title,
            description: event.description,
            start: { dateTime: startTime.toISOString() },
            end: { dateTime: endTime.toISOString() },
            location: event.venue
          };

          const googleEvent = await this.googleCalendarAdapter.insertEvent(user, eventBody, targetGoogleCalId);

          // Update event with Google sync info
          await this.eventRepository.update(event.id, {
            external: {
              google: {
                calendarId: targetGoogleCalId,
                eventId: googleEvent.id,
                etag: googleEvent.etag
              }
            }
          });
        }
      }
    } catch (error) {
      // Log but don't fail event creation
      console.warn('Google calendar sync failed during event creation', error);
    }

    // Handle participants - only for hangouts
    let participants = [];
    if (category === 'hangout') {
      // Hangouts require participants
      if (!Array.isArray(dto.participants) || dto.participants.length === 0) {
        throw new ValidationError('Hangouts require at least one participant');
      }

      // Normalize participants
      const normalizedParticipants = dto.participants
        .filter(p => p && (p.userId || p.user))
        .map(p => ({
          user: p.userId || p.user,
          role: p.role || 'attendee'
        }));

      if (normalizedParticipants.length > 0) {
        // Check for existing participants
        const userIds = normalizedParticipants.map(p => p.user);
        const existingParticipants = await Promise.all(
          userIds.map(userId => this.eventParticipantRepository.findByEventAndUser(event.id, userId))
        );

        const existingUserIds = new Set(
          existingParticipants.filter(p => p !== null).map(p => p.user.toString())
        );

        // Filter out existing participants
        const newParticipants = normalizedParticipants.filter(
          p => !existingUserIds.has(p.user.toString())
        );

        if (newParticipants.length > 0) {
          // Create participants
          const participantsData = newParticipants.map(p => ({
            event: event.id,
            user: p.user,
            role: p.role
          }));

          const createdParticipants = await this.eventParticipantRepository.createMany(participantsData);
          participants = createdParticipants.map(p => p.toJSON());

          // Send notifications - use "Hangout Invitation" for hangouts
          await Promise.all(
            createdParticipants.map(participant =>
              this.notificationAdapter.send(participant.user, {
                title: 'Hangout Invitation',
                body: `You have been invited to the hangout "${event.title}"`
              }, {
                type: 'hangout_invitation',
                eventId: event.id
              })
            )
          );

          // Add to Google Calendar for participants
          await Promise.all(
            createdParticipants.map(async (participant) => {
              try {
                const participantUser = await this.userRepository.findById(participant.user);
                if (participantUser && participantUser.providerLinks?.google && participantUser.googleCalendar?.refreshToken) {
                  const eventBody = {
                    summary: event.title,
                    description: event.description || `You've been invited to ${event.title}`,
                    start: { dateTime: startTime.toISOString() },
                    end: { dateTime: endTime.toISOString() },
                    location: event.venue || undefined
                  };

                  await this.googleCalendarAdapter.insertEvent(participantUser, eventBody);
                }
              } catch (error) {
                console.warn('Failed to add event to participant Google Calendar', error);
              }
            })
          );

          // Handle group for hangout (only for hangouts)
          if (this.groupRepository) {
            try {
              let group;

              // If groupId is provided, use existing group
              if (dto.groupId) {
                group = await this.groupRepository.findById(dto.groupId);
                if (!group) {
                  throw new ValidationError('Group not found');
                }

                // Get existing group members
                const existingMemberIds = new Set(
                  group.members.map(m => m.user.toString())
                );

                // Add only new participants to the group
                const participantUserIds = createdParticipants.map(p => p.user.toString());
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
                }

                // Link the event to the existing group
                try {
                  await this.groupRepository.addEvent(group.id, event.id);
                } catch (error) {
                  console.warn('Failed to link event to group:', error.message);
                }

                // Update Firebase sync for existing group (non-blocking)
                if (this.firebaseAdapter) {
                  setImmediate(async () => {
                    try {
                      const updatedGroup = await this.groupRepository.findById(group.id);
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
                      console.error('Failed to sync group to Firebase:', error);
                    }
                  });
                }

                console.log(`Event linked to existing group: ${group.id}`);
              } else {
                // Create new group with event title as name
                // Note: Creator is automatically added as admin member by Group schema pre-save hook
                const groupName = event.title || 'Hangout Group';
                group = await this.groupRepository.create({
                  name: groupName,
                  description: event.description || `Group for hangout: ${groupName}`,
                  creator: userId
                });

                // Add all participants as members
                const participantUserIds = createdParticipants.map(p => p.user.toString());
                await Promise.all(
                  participantUserIds.map(async (participantUserId) => {
                    try {
                      await this.groupRepository.addMember(group.id, participantUserId, userId, 'member');
                    } catch (error) {
                      // Member might already exist, ignore
                      console.warn(`Failed to add participant ${participantUserId} to group:`, error.message);
                    }
                  })
                );

                // Link the event to the group
                try {
                  await this.groupRepository.addEvent(group.id, event.id);
                } catch (error) {
                  console.warn('Failed to link event to group:', error.message);
                }

                // Get populated group with all members
                const populatedGroup = await this.groupRepository.findById(group.id);

                // Sync to Firebase (non-blocking)
                if (this.firebaseAdapter && populatedGroup) {
                  setImmediate(async () => {
                    try {
                      const plainMembers = {};
                      for (const member of populatedGroup.members) {
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

                      await this.firebaseAdapter.createGroup(populatedGroup.id, {
                        name: populatedGroup.name,
                        description: populatedGroup.description || '',
                        creator: userId,
                        members: plainMembers
                      });
                    } catch (error) {
                      console.error('Failed to sync group to Firebase:', error);
                    }
                  });
                }

                console.log(`Group created for hangout: ${group.id}`);
              }
            } catch (error) {
              // Log but don't fail event creation if group operation fails
              console.warn('Failed to handle group for hangout:', error);
            }
          }
        }
      }
    }

    return {
      event: event.toJSON(),
      calendar: calendar.toJSON(),
      participants
    };
  }
}

module.exports = CreateEventUseCase;

