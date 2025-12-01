/**
 * Notification Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');

class NotificationController {
  constructor({
    registerDeviceTokenUseCase,
    removeDeviceTokenUseCase,
    getNotificationsUseCase,
    markAsReadUseCase,
    deleteNotificationsUseCase
  }) {
    this.registerDeviceTokenUseCase = registerDeviceTokenUseCase;
    this.removeDeviceTokenUseCase = removeDeviceTokenUseCase;
    this.getNotificationsUseCase = getNotificationsUseCase;
    this.markAsReadUseCase = markAsReadUseCase;
    this.deleteNotificationsUseCase = deleteNotificationsUseCase;
  }

  registerDeviceToken = asyncHandler(async (req, res) => {
    const result = await this.registerDeviceTokenUseCase.execute(
      req.user.id,
      req.body.token,
      req.body.platform
    );

    return successResponse(res, result, 200, result.message);
  });

  removeDeviceToken = asyncHandler(async (req, res) => {
    const result = await this.removeDeviceTokenUseCase.execute(
      req.user.id,
      req.body.token
    );

    return successResponse(res, result, 200, result.message);
  });

  getNotifications = asyncHandler(async (req, res) => {
    const { GetNotificationsDTO } = require('../../application/dto');
    const dto = new GetNotificationsDTO(req.query);
    const result = await this.getNotificationsUseCase.execute(req.user.id, dto);

    return successResponse(res, result);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const { MarkAsReadDTO } = require('../../application/dto');
    const dto = new MarkAsReadDTO(req.body);
    const result = await this.markAsReadUseCase.execute(req.user.id, dto);

    return successResponse(res, result, 200, result.message);
  });

  deleteNotifications = asyncHandler(async (req, res) => {
    const { DeleteNotificationsDTO } = require('../../application/dto');
    const dto = new DeleteNotificationsDTO(req.body);
    const result = await this.deleteNotificationsUseCase.execute(req.user.id, dto);

    return successResponse(res, result, 200, result.message);
  });
}

module.exports = NotificationController;

