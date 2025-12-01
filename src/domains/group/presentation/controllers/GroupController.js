/**
 * Group Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');

class GroupController {
  constructor({
    createGroupUseCase,
    createGroupFromEventUseCase,
    getUserGroupsUseCase,
    getGroupUseCase,
    updateGroupUseCase,
    addMemberUseCase,
    removeMemberUseCase,
    updateMemberRoleUseCase,
    searchGroupsUseCase,
    deleteGroupUseCase,
    createGroupEventUseCase
  }) {
    this.createGroupUseCase = createGroupUseCase;
    this.createGroupFromEventUseCase = createGroupFromEventUseCase;
    this.getUserGroupsUseCase = getUserGroupsUseCase;
    this.getGroupUseCase = getGroupUseCase;
    this.updateGroupUseCase = updateGroupUseCase;
    this.addMemberUseCase = addMemberUseCase;
    this.removeMemberUseCase = removeMemberUseCase;
    this.updateMemberRoleUseCase = updateMemberRoleUseCase;
    this.searchGroupsUseCase = searchGroupsUseCase;
    this.deleteGroupUseCase = deleteGroupUseCase;
    this.createGroupEventUseCase = createGroupEventUseCase;
  }

  createGroup = asyncHandler(async (req, res) => {
    const { CreateGroupDTO } = require('../../application/dto');
    const dto = new CreateGroupDTO(req.body);
    const result = await this.createGroupUseCase.execute(req.user.id, dto);

    return successResponse(res, { group: result }, 201, 'Group created successfully');
  });

  createGroupFromEvent = asyncHandler(async (req, res) => {
    const { eventId, groupName } = req.body;
    const result = await this.createGroupFromEventUseCase.execute(req.user.id, eventId, groupName);

    return successResponse(res, { group: result }, 201, 'Group created from event successfully');
  });

  getUserGroups = asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const result = await this.getUserGroupsUseCase.execute(req.user.id, includeInactive);

    return successResponse(res, { groups: result });
  });

  getGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.getGroupUseCase.execute(id, req.user.id);

    return successResponse(res, { group: result });
  });

  updateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { UpdateGroupDTO } = require('../../application/dto');
    const dto = new UpdateGroupDTO(req.body);
    const result = await this.updateGroupUseCase.execute(id, req.user.id, dto);

    return successResponse(res, { group: result }, 200, 'Group updated successfully');
  });

  addMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;
    const result = await this.addMemberUseCase.execute(id, req.user.id, userId, role);

    return successResponse(res, { group: result }, 200, 'Member added successfully');
  });

  removeMember = asyncHandler(async (req, res) => {
    const { groupId, memberId } = req.body;
    const result = await this.removeMemberUseCase.execute(groupId, req.user.id, memberId);

    return successResponse(res, { group: result }, 200, 'Member removed successfully');
  });

  updateMemberRole = asyncHandler(async (req, res) => {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const result = await this.updateMemberRoleUseCase.execute(id, req.user.id, memberId, role);

    return successResponse(res, { group: result }, 200, 'Member role updated successfully');
  });

  searchGroups = asyncHandler(async (req, res) => {
    const { q, limit = 20 } = req.query;
    const result = await this.searchGroupsUseCase.execute(q, req.user.id, parseInt(limit));

    return successResponse(res, { groups: result });
  });

  deleteGroup = asyncHandler(async (req, res) => {
    const { id } = req.body;
    const result = await this.deleteGroupUseCase.execute(id, req.user.id);

    return successResponse(res, null, 200, result.message);
  });

  createGroupEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { participationMode = 'invite_only', ...eventData } = req.body;
    const result = await this.createGroupEventUseCase.execute(id, req.user.id, eventData, participationMode);

    return successResponse(res, { event: result }, 201, 'Group event created successfully');
  });
}

module.exports = GroupController;

