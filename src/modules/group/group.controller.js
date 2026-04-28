/**
 * Group Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');

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

  /**
   * @swagger
   * /groups:
   *   post:
   *     summary: Create a new group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       201:
   *         description: Group created
   */
  createGroup = asyncHandler(async (req, res) => {
    // Debug logging
    console.log('[CreateGroup] Request body:', {
      name: req.body.name,
      nameType: typeof req.body.name,
      nameLength: req.body.name?.length,
      bodyKeys: Object.keys(req.body),
      fullBody: req.body
    });

    const { CreateGroupDTO } = require('./dto');
    const dto = new CreateGroupDTO(req.body);
    const result = await this.createGroupUseCase.execute(req.user.id, dto);

    return successResponse(res, { group: result }, 201, 'Group created successfully');
  });

  /**
   * @swagger
   * /groups/from-event:
   *   post:
   *     summary: Create group from event
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [eventId, groupName]
   *             properties:
   *               eventId:
   *                 type: string
   *               groupName:
   *                 type: string
   *     responses:
   *       201:
   *         description: Group created
   */
  createGroupFromEvent = asyncHandler(async (req, res) => {
    const { eventId, groupName } = req.body;
    const result = await this.createGroupFromEventUseCase.execute(req.user.id, eventId, groupName);

    return successResponse(res, { group: result }, 201, 'Group created from event successfully');
  });

  /**
   * @swagger
   * /groups/my:
   *   get:
   *     summary: Get current user groups
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of groups
   */
  getUserGroups = asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const { groups, friends } = await this.getUserGroupsUseCase.execute(req.user.id, includeInactive);

    return successResponse(res, { groups, friends });
  });

  /**
   * @swagger
   * /groups/{id}:
   *   get:
   *     summary: Get group details
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Group details
   */
  getGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.getGroupUseCase.execute(id, req.user.id);

    return successResponse(res, { group: result });
  });

  /**
   * @swagger
   * /groups/{id}:
   *   put:
   *     summary: Update group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Group updated
   */
  updateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { UpdateGroupDTO } = require('./dto');
    const dto = new UpdateGroupDTO(req.body);
    const result = await this.updateGroupUseCase.execute(id, req.user.id, dto);

    return successResponse(res, { group: result }, 200, 'Group updated successfully');
  });

  /**
   * @swagger
   * /groups/{id}/members:
   *   post:
   *     summary: Add member to group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [userId]
   *             properties:
   *               userId:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [member, admin]
   *     responses:
   *       200:
   *         description: Member added
   */
  addMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;
    const result = await this.addMemberUseCase.execute(id, req.user.id, userId, role);

    return successResponse(res, { group: result }, 200, 'Member added successfully');
  });

  /**
   * @swagger
   * /groups/members:
   *   delete:
   *     summary: Remove member from group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [groupId, memberId]
   *             properties:
   *               groupId:
   *                 type: string
   *               memberId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Member removed
   */
  removeMember = asyncHandler(async (req, res) => {
    const { groupId, memberId } = req.body;
    const result = await this.removeMemberUseCase.execute(groupId, req.user.id, memberId);

    return successResponse(res, { group: result }, 200, 'Member removed successfully');
  });

  /**
   * @swagger
   * /groups/{id}/members/{memberId}/role:
   *   put:
   *     summary: Update member role
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: memberId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [role]
   *             properties:
   *               role:
   *                 type: string
   *                 enum: [member, admin]
   *     responses:
   *       200:
   *         description: Role updated
   */
  updateMemberRole = asyncHandler(async (req, res) => {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const result = await this.updateMemberRoleUseCase.execute(id, req.user.id, memberId, role);

    return successResponse(res, { group: result }, 200, 'Member role updated successfully');
  });

  /**
   * @swagger
   * /groups/search:
   *   get:
   *     summary: Search for groups
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Search results
   */
  searchGroups = asyncHandler(async (req, res) => {
    const { q, limit = 20 } = req.query;
    const result = await this.searchGroupsUseCase.execute(q, req.user.id, parseInt(limit));

    return successResponse(res, { groups: result });
  });

  /**
   * @swagger
   * /groups:
   *   delete:
   *     summary: Delete a group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [id]
   *             properties:
   *               id:
   *                 type: string
   *     responses:
   *       200:
   *         description: Group deleted
   */
  deleteGroup = asyncHandler(async (req, res) => {
    const { id } = req.body;
    const result = await this.deleteGroupUseCase.execute(id, req.user.id);

    return successResponse(res, null, 200, result.message);
  });

  /**
   * @swagger
   * /groups/{id}/events:
   *   post:
   *     summary: Create an event for a group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       201:
   *         description: Event created
   */
  createGroupEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { participationMode = 'invite_only', ...eventData } = req.body;
    const result = await this.createGroupEventUseCase.execute(id, req.user.id, eventData, participationMode);

    return successResponse(res, { event: result }, 201, 'Group event created successfully');
  });
}

module.exports = GroupController;

