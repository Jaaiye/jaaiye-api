/**
 * Friendship Domain Dependency Injection Container
 */

// Shared Domain
const { UserRepository } = require('../common/repositories');
const { NotificationAdapter: SharedNotificationAdapter, FirebaseAdapter } = require('../common/services');
// Notification Domain
const { NotificationRepository } = require('../notification/repositories');
const {FriendshipRepository, FriendRequestRepository} = require('./repositories');
const { PushNotificationAdapter, DeviceTokenAdapter } = require('../notification/services');
const { SendNotificationUseCase } = require('../notification/use-cases');

// Application
const {
  SearchUsersUseCase,
  SendFriendRequestUseCase,
  GetFriendRequestsUseCase,
  RespondToFriendRequestUseCase,
  GetFriendsUseCase,
  RemoveFriendUseCase,
  BlockUserUseCase,
  UnblockUserUseCase,
  UpdateFriendSettingsUseCase
} = require('./use-cases');

// Presentation
const FriendshipController = require('./friendship.controller');
const createFriendshipRoutes = require('./friendship.routes');

class FriendshipModule {
  constructor() {
    this._instances = {};
  }

  /**
   * Get repositories
   */
  getUserRepository() {
    if (!this._instances.userRepository) {
      this._instances.userRepository = new UserRepository();
    }
    return this._instances.userRepository;
  }

  getFriendshipRepository() {
    if (!this._instances.friendshipRepository) {
      this._instances.friendshipRepository = new FriendshipRepository();
    }
    return this._instances.friendshipRepository;
  }

  getFriendRequestRepository() {
    if (!this._instances.friendRequestRepository) {
      this._instances.friendRequestRepository = new FriendRequestRepository();
    }
    return this._instances.friendRequestRepository;
  }

  getNotificationAdapter() {
    if (!this._instances.notificationAdapter) {
      // Initialize Notification domain dependencies
      const notificationRepository = new NotificationRepository();
      const firebaseAdapter = new FirebaseAdapter();
      const deviceTokenAdapter = new DeviceTokenAdapter();
      const pushNotificationAdapter = new PushNotificationAdapter({
        firebaseAdapter,
        deviceTokenAdapter
      });
      const sendNotificationUseCase = new SendNotificationUseCase({
        notificationRepository,
        pushNotificationAdapter
      });

      // Create shared adapter with dependencies
      this._instances.notificationAdapter = new SharedNotificationAdapter({
        sendNotificationUseCase,
        notificationRepository
      });
    }
    return this._instances.notificationAdapter;
  }

  /**
   * Get use cases
   */
  getSearchUsersUseCase() {
    if (!this._instances.searchUsersUseCase) {
      this._instances.searchUsersUseCase = new SearchUsersUseCase({
        userRepository: this.getUserRepository(),
        friendshipRepository: this.getFriendshipRepository(),
        friendRequestRepository: this.getFriendRequestRepository()
      });
    }
    return this._instances.searchUsersUseCase;
  }

  getSendFriendRequestUseCase() {
    if (!this._instances.sendFriendRequestUseCase) {
      this._instances.sendFriendRequestUseCase = new SendFriendRequestUseCase({
        userRepository: this.getUserRepository(),
        friendshipRepository: this.getFriendshipRepository(),
        friendRequestRepository: this.getFriendRequestRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.sendFriendRequestUseCase;
  }

  getGetFriendRequestsUseCase() {
    if (!this._instances.getFriendRequestsUseCase) {
      this._instances.getFriendRequestsUseCase = new GetFriendRequestsUseCase({
        friendRequestRepository: this.getFriendRequestRepository()
      });
    }
    return this._instances.getFriendRequestsUseCase;
  }

  getRespondToFriendRequestUseCase() {
    if (!this._instances.respondToFriendRequestUseCase) {
      this._instances.respondToFriendRequestUseCase = new RespondToFriendRequestUseCase({
        userRepository: this.getUserRepository(),
        friendshipRepository: this.getFriendshipRepository(),
        friendRequestRepository: this.getFriendRequestRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.respondToFriendRequestUseCase;
  }

  getGetFriendsUseCase() {
    if (!this._instances.getFriendsUseCase) {
      this._instances.getFriendsUseCase = new GetFriendsUseCase({
        friendshipRepository: this.getFriendshipRepository()
      });
    }
    return this._instances.getFriendsUseCase;
  }

  getRemoveFriendUseCase() {
    if (!this._instances.removeFriendUseCase) {
      this._instances.removeFriendUseCase = new RemoveFriendUseCase({
        friendshipRepository: this.getFriendshipRepository()
      });
    }
    return this._instances.removeFriendUseCase;
  }

  getBlockUserUseCase() {
    if (!this._instances.blockUserUseCase) {
      this._instances.blockUserUseCase = new BlockUserUseCase({
        userRepository: this.getUserRepository(),
        friendshipRepository: this.getFriendshipRepository()
      });
    }
    return this._instances.blockUserUseCase;
  }

  getUnblockUserUseCase() {
    if (!this._instances.unblockUserUseCase) {
      this._instances.unblockUserUseCase = new UnblockUserUseCase({
        friendshipRepository: this.getFriendshipRepository()
      });
    }
    return this._instances.unblockUserUseCase;
  }

  getUpdateFriendSettingsUseCase() {
    if (!this._instances.updateFriendSettingsUseCase) {
      this._instances.updateFriendSettingsUseCase = new UpdateFriendSettingsUseCase({
        userRepository: this.getUserRepository()
      });
    }
    return this._instances.updateFriendSettingsUseCase;
  }

  /**
   * Get controller
   */
  getFriendshipController() {
    if (!this._instances.friendshipController) {
      this._instances.friendshipController = new FriendshipController({
        searchUsersUseCase: this.getSearchUsersUseCase(),
        sendFriendRequestUseCase: this.getSendFriendRequestUseCase(),
        getFriendRequestsUseCase: this.getGetFriendRequestsUseCase(),
        respondToFriendRequestUseCase: this.getRespondToFriendRequestUseCase(),
        getFriendsUseCase: this.getGetFriendsUseCase(),
        removeFriendUseCase: this.getRemoveFriendUseCase(),
        blockUserUseCase: this.getBlockUserUseCase(),
        unblockUserUseCase: this.getUnblockUserUseCase(),
        updateFriendSettingsUseCase: this.getUpdateFriendSettingsUseCase()
      });
    }
    return this._instances.friendshipController;
  }

  /**
   * Get routes
   */
  getFriendshipRoutes() {
    if (!this._instances.friendshipRoutes) {
      this._instances.friendshipRoutes = createFriendshipRoutes({
        friendshipController: this.getFriendshipController()
      });
    }
    return this._instances.friendshipRoutes;
  }
}

// Export singleton instance
module.exports = new FriendshipModule();


