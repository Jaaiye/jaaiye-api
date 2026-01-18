/**
 * Add Event Team Member Use Case
 * Application layer - add a team member (co-organizer or ticket scanner) to an event
 */

const { EventNotFoundError, EventAccessDeniedError, ValidationError } = require('../errors');
const { UserNotFoundError } = require('../../common/errors');

class AddEventTeamMemberUseCase {
  constructor({ eventRepository, eventTeamRepository, userRepository, notificationAdapter }) {
    this.eventRepository = eventRepository;
    this.eventTeamRepository = eventTeamRepository;
    this.userRepository = userRepository;
    this.notificationAdapter = notificationAdapter;
  }

  async execute(eventId, userId, { username, email, role }) {
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

    // Only events (not hangouts) can have team members
    if (event.category !== 'event') {
      throw new ValidationError('Only ticketed events can have team members');
    }

    // Only event creator can add team members
    if (event.origin === 'user' && event.creatorId && String(event.creatorId) !== String(userId)) {
      throw new EventAccessDeniedError('Only the event creator can add team members');
    }

    // Validate role
    if (!['co_organizer', 'ticket_scanner'].includes(role)) {
      throw new ValidationError('Invalid role. Must be co_organizer or ticket_scanner');
    }

    // Validate that either username or email is provided
    if (!username && !email) {
      throw new ValidationError('Either username or email is required');
    }

    // Find user by username or email
    let teamMember = null;
    if (username) {
      teamMember = await this.userRepository.findByUsername(username);
    }
    if (!teamMember && email) {
      teamMember = await this.userRepository.findByEmail(email);
    }

    if (!teamMember) {
      throw new UserNotFoundError('User not found with the provided username or email');
    }

    const teamMemberUserId = teamMember.id;

    // Cannot add yourself
    if (String(teamMemberUserId) === String(userId)) {
      throw new ValidationError('Cannot add yourself as a team member');
    }

    // Check if already a team member
    const existing = await this.eventTeamRepository.findByEventAndUser(event._id || event.id, teamMemberUserId);
    if (existing) {
      throw new ValidationError('User is already a team member');
    }

    // Create team member
    const teamMemberEntity = await this.eventTeamRepository.create({
      event: event._id || event.id,
      user: teamMemberUserId,
      role,
      invitedBy: userId,
      status: 'pending'
    });

    // Send push notification to invited user
    if (this.notificationAdapter) {
      const inviter = await this.userRepository.findById(userId);
      const eventSlug = event.slug || event.id;
      const roleLabel = role === 'co_organizer' ? 'Co-Organizer' : 'Ticket Scanner';

      setImmediate(async () => {
        try {
          console.log(`[AddEventTeamMember] Sending notification to user ${teamMemberUserId} for event ${event._id || event.id}`);
          await this.notificationAdapter.send(teamMemberUserId, {
            title: 'Team Invitation',
            body: `${inviter?.username || inviter?.fullName || 'Someone'} invited you as ${roleLabel} for "${event.title}"`
          }, {
            type: 'team_invitation',
            eventId: event._id || event.id,
            slug: eventSlug,
            role: role,
            teamMemberId: teamMemberEntity.id,
            path: `notifications`
          });
          console.log(`[AddEventTeamMember] Notification sent successfully to user ${teamMemberUserId}`);
        } catch (error) {
          console.error('[AddEventTeamMember] Failed to send team invitation notification:', error);
        }
      });
    }

    return teamMemberEntity;
  }
}

module.exports = AddEventTeamMemberUseCase;

