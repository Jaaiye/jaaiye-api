/**
 * List Team Invitations Use Case
 * Application layer - list pending team invitations for a user
 */

class ListTeamInvitationsUseCase {
    constructor({ eventTeamRepository }) {
        this.eventTeamRepository = eventTeamRepository;
    }

    async execute(userId) {
        const invitations = await this.eventTeamRepository.findInvitationsByUser(userId);

        // Return only necessary fields
        return invitations.map(invitation => {
            const inv = invitation.toJSON();
            return {
                id: inv.id,
                event: inv.event, // Now contains populated object from repository
                role: inv.role,
                invitedBy: inv.invitedBy,
                status: inv.status,
                createdAt: inv.createdAt
            };
        });
    }
}

module.exports = ListTeamInvitationsUseCase;
