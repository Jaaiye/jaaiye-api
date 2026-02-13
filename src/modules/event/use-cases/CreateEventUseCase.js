/**
 * Create Event Use Case
 * Application layer - use case
 */

const { ValidationError, NotFoundError } = require('../../common/errors');
const { EventNotFoundError } = require('../errors');

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
    firebaseAdapter,
    walletRepository,
    calendarSyncService
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
    this.walletRepository = walletRepository;
    this.calendarSyncService = calendarSyncService;
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
      // Get or create user's default calendar
      calendar = await this.calendarRepository.findByOwner(userId);
      if (!calendar) {
        // Auto-create calendar if it doesn't exist (should have been created during registration, but handle edge case)
        const user = await this.userRepository.findById(userId);
        if (!user) {
          throw new NotFoundError('User not found');
        }

        calendar = await this.calendarRepository.create({
          owner: userId,
          name: `${user.username || user.fullName}'s Calendar`,
          isDefault: true,
          isPublic: false
        });

        console.log('Auto-created calendar for user during event creation:', {
          userId,
          calendarId: calendar.id
        });
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
        type: type.type || 'custom',
        name: type.name,
        description: type.description,
        price: type.price === undefined || type.price === null || type.price === '' ? 0 : Number(type.price),
        admissionSize: type.admissionSize === undefined || type.admissionSize === null || type.admissionSize === '' ? 1 : Number(type.admissionSize),
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

    // Determine legacy createdBy string and normalized creator/origin
    // - For regular users: createdBy = userId (string), origin = 'user', creatorId = userId
    // - For admin/superadmin: createdBy = 'Jaaiye', origin = 'jaaiye', creatorId = null (platform-owned)
    let createdBy = userId;
    let origin = 'user';
    let creatorId = userId;
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      createdBy = 'Jaaiye';
      origin = 'jaaiye';
      creatorId = userId;
    }

    // Create event
    const eventData = {
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
      createdBy,
      origin,
      creatorId,
    };

    if (category === 'event') {
      eventData.status = 'published';
      eventData.publishedAt = new Date();
    } else {
      eventData.status = 'scheduled';
    }

    const event = await this.eventRepository.create(eventData);

    // Automatically create wallet for paid events (category === 'event')
    if (category === 'event' && this.walletRepository) {
      try {
        const existingWallet = await this.walletRepository.findByOwner('EVENT', event.id);
        if (!existingWallet) {
          await this.walletRepository.create({
            ownerType: 'EVENT',
            ownerId: event.id,
            balance: 0.0,
            currency: 'NGN'
          });
        }
      } catch (walletError) {
        // ⚠️ Warning: wallet creation failed, but event creation succeeded
        // 💡 Suggestion: monitor logs to ensure wallet sync issues are handled
        console.warn('Failed to create wallet for event', { eventId: event.id, error: walletError.message });
      }
    }

    // Sync creator's event to their calendars (non-blocking)
    // Skip Google sync for Jaaiye events (admin/superadmin created)
    const isJaaiyeEvent = origin === 'jaaiye';

    if (this.calendarSyncService && user) {
      // Event is already added to creator's calendar via calendar field
      // Sync to creator's Jaaiye calendar (ensures participant record exists) and Google calendar
      // Skip Google sync for Jaaiye events (admin/superadmin created events)
      this.calendarSyncService.syncEventToUserCalendars(userId, event, {
        skipGoogle: isJaaiyeEvent // Skip Google sync for Jaaiye events
      }).catch(error => {
        console.warn('[CreateEvent] Calendar sync failed for creator:', error);
      });
    } else if (!isJaaiyeEvent && user && user.providerLinks?.google && user.googleCalendar?.refreshToken) {
      // Fallback: Direct Google sync for non-Jaaiye events (legacy behavior)
      // This is non-blocking - runs in background
      setImmediate(async () => {
        try {
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
        } catch (error) {
          console.warn('[CreateEvent] Google calendar sync failed during event creation', error);
        }
      });
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
          // Fetch event again to get the slug (generated in pre-save hook)
          const eventWithSlug = await this.eventRepository.findById(event.id);
          const eventSlug = eventWithSlug?.slug || event.id;

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

          await Promise.all(
            uniqueParticipantsToNotify.map(participant => {
              const participantUserId = participant.user?.toString ? participant.user.toString() : String(participant.user);
              return this.notificationAdapter.send(participantUserId, {
                title: 'Hangout Invitation',
                body: `You have been invited to the hangout "${event.title}"`
              }, {
                type: 'hangout_invitation',
                eventId: event.id,
                slug: eventSlug,
                path: `hangoutScreen/${eventSlug}`
              });
            })
          );

          // Sync event to participants' calendars (Jaaiye + Google) - non-blocking
          if (this.calendarSyncService) {
            const participantUserIds = createdParticipants.map(p =>
              p.user?.toString ? p.user.toString() : String(p.user)
            );

            this.calendarSyncService.syncEventToMultipleUsers(participantUserIds, event, {
              skipGoogle: false // Sync to Google for participants
            }).catch(error => {
              console.warn('[CreateEvent] Calendar sync failed for participants:', error);
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
            });
          }

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

                // Get existing group members (ensure they are strings)
                const existingMemberIds = new Set(
                  group.members.map(m => {
                    const memberUserId = typeof m.user === 'object' ? m.user.id || m.user._id : m.user;
                    return memberUserId?.toString ? memberUserId.toString() : String(memberUserId);
                  })
                );

                // Add only new participants to the group
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
                const participantUserIds = createdParticipants.map(p => {
                  const u = p.user;
                  if (!u) return '';
                  const id = typeof u === 'object' ? (u.id || u._id || u) : u;
                  if (typeof id === 'string') return id;
                  if (id.toHexString) return id.toHexString();
                  if (Buffer.isBuffer(id)) return id.toString('hex');
                  return String(id);
                });

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

                      await this.firebaseAdapter.createGroup(populatedGroup.id, {
                        name: populatedGroup.name,
                        description: populatedGroup.description || '',
                        creator: initiatorId,
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
      calendar: calendar.toObject ? calendar.toObject() : calendar,
      participants
    };
  }
}

module.exports = CreateEventUseCase;

