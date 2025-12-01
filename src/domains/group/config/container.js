/**
 * Group Domain Container
 * Dependency Injection container for Group domain
 */

const { GroupRepository } = require('../infrastructure/persistence/repositories');
const { FirebaseAdapter } = require('../infrastructure/adapters');
const { UserRepository } = require('../../shared/infrastructure/persistence/repositories');
const { CalendarRepository } = require('../../calendar/infrastructure/persistence/repositories');
const { EventRepository, EventParticipantRepository } = require('../../event/infrastructure/persistence/repositories');
const { NotificationAdapter: SharedNotificationAdapter } = require('../../shared/infrastructure/adapters');
const { NotificationRepository } = require('../../notification/infrastructure/persistence/repositories');
const { PushNotificationAdapter, FirebaseAdapter: NotificationFirebaseAdapter, DeviceTokenAdapter } = require('../../notification/infrastructure/adapters');
const { SendNotificationUseCase } = require('../../notification/application/use-cases');
const {
  CreateGroupUseCase,
  CreateGroupFromEventUseCase,
  GetUserGroupsUseCase,
  GetGroupUseCase,
  UpdateGroupUseCase,
  AddMemberUseCase,
  RemoveMemberUseCase,
  UpdateMemberRoleUseCase,
  SearchGroupsUseCase,
  DeleteGroupUseCase,
  CreateGroupEventUseCase
} = require('../application/use-cases');
const GroupController = require('../presentation/controllers/GroupController');
const createGroupRoutes = require('../presentation/routes/group.routes');

class GroupContainer {
  constructor() {
    this._instances = {};
  }

  // ============================================================================
  // REPOSITORIES
  // ============================================================================

  getGroupRepository() {
    if (!this._instances.groupRepository) {
      this._instances.groupRepository = new GroupRepository();
    }
    return this._instances.groupRepository;
  }

  getUserRepository() {
    if (!this._instances.userRepository) {
      this._instances.userRepository = new UserRepository();
    }
    return this._instances.userRepository;
  }

  getEventRepository() {
    if (!this._instances.eventRepository) {
      this._instances.eventRepository = new EventRepository();
    }
    return this._instances.eventRepository;
  }

  getEventParticipantRepository() {
    if (!this._instances.eventParticipantRepository) {
      this._instances.eventParticipantRepository = new EventParticipantRepository();
    }
    return this._instances.eventParticipantRepository;
  }

  getCalendarRepository() {
    if (!this._instances.calendarRepository) {
      this._instances.calendarRepository = new CalendarRepository();
    }
    return this._instances.calendarRepository;
  }

  // ============================================================================
  // ADAPTERS
  // ============================================================================

  getFirebaseAdapter() {
    if (!this._instances.firebaseAdapter) {
      this._instances.firebaseAdapter = new FirebaseAdapter();
    }
    return this._instances.firebaseAdapter;
  }

  getNotificationAdapter() {
    if (!this._instances.notificationAdapter) {
      // Initialize Notification domain dependencies
      const notificationRepository = new NotificationRepository();
      const firebaseAdapter = new NotificationFirebaseAdapter();
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

  // ============================================================================
  // USE CASES
  // ============================================================================

  getCreateGroupUseCase() {
    if (!this._instances.createGroupUseCase) {
      this._instances.createGroupUseCase = new CreateGroupUseCase({
        groupRepository: this.getGroupRepository(),
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.createGroupUseCase;
  }

  getCreateGroupFromEventUseCase() {
    if (!this._instances.createGroupFromEventUseCase) {
      this._instances.createGroupFromEventUseCase = new CreateGroupFromEventUseCase({
        groupRepository: this.getGroupRepository(),
        eventRepository: this.getEventRepository(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.createGroupFromEventUseCase;
  }

  getGetUserGroupsUseCase() {
    if (!this._instances.getUserGroupsUseCase) {
      this._instances.getUserGroupsUseCase = new GetUserGroupsUseCase({
        groupRepository: this.getGroupRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.getUserGroupsUseCase;
  }

  getGetGroupUseCase() {
    if (!this._instances.getGroupUseCase) {
      this._instances.getGroupUseCase = new GetGroupUseCase({
        groupRepository: this.getGroupRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.getGroupUseCase;
  }

  getUpdateGroupUseCase() {
    if (!this._instances.updateGroupUseCase) {
      this._instances.updateGroupUseCase = new UpdateGroupUseCase({
        groupRepository: this.getGroupRepository(),
        firebaseAdapter: this.getFirebaseAdapter()
      });
    }
    return this._instances.updateGroupUseCase;
  }

  getAddMemberUseCase() {
    if (!this._instances.addMemberUseCase) {
      this._instances.addMemberUseCase = new AddMemberUseCase({
        groupRepository: this.getGroupRepository(),
        userRepository: this.getUserRepository(),
        firebaseAdapter: this.getFirebaseAdapter(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.addMemberUseCase;
  }

  getRemoveMemberUseCase() {
    if (!this._instances.removeMemberUseCase) {
      this._instances.removeMemberUseCase = new RemoveMemberUseCase({
        groupRepository: this.getGroupRepository(),
        firebaseAdapter: this.getFirebaseAdapter(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.removeMemberUseCase;
  }

  getUpdateMemberRoleUseCase() {
    if (!this._instances.updateMemberRoleUseCase) {
      this._instances.updateMemberRoleUseCase = new UpdateMemberRoleUseCase({
        groupRepository: this.getGroupRepository()
      });
    }
    return this._instances.updateMemberRoleUseCase;
  }

  getSearchGroupsUseCase() {
    if (!this._instances.searchGroupsUseCase) {
      this._instances.searchGroupsUseCase = new SearchGroupsUseCase({
        groupRepository: this.getGroupRepository()
      });
    }
    return this._instances.searchGroupsUseCase;
  }

  getDeleteGroupUseCase() {
    if (!this._instances.deleteGroupUseCase) {
      this._instances.deleteGroupUseCase = new DeleteGroupUseCase({
        groupRepository: this.getGroupRepository(),
        eventRepository: this.getEventRepository(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        firebaseAdapter: this.getFirebaseAdapter(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.deleteGroupUseCase;
  }

  getCreateGroupEventUseCase() {
    if (!this._instances.createGroupEventUseCase) {
      this._instances.createGroupEventUseCase = new CreateGroupEventUseCase({
        groupRepository: this.getGroupRepository(),
        eventRepository: this.getEventRepository(),
        eventParticipantRepository: this.getEventParticipantRepository(),
        calendarRepository: this.getCalendarRepository(),
        userRepository: this.getUserRepository(),
        notificationAdapter: this.getNotificationAdapter()
      });
    }
    return this._instances.createGroupEventUseCase;
  }

  // ============================================================================
  // CONTROLLER
  // ============================================================================

  getGroupController() {
    if (!this._instances.groupController) {
      this._instances.groupController = new GroupController({
        createGroupUseCase: this.getCreateGroupUseCase(),
        createGroupFromEventUseCase: this.getCreateGroupFromEventUseCase(),
        getUserGroupsUseCase: this.getGetUserGroupsUseCase(),
        getGroupUseCase: this.getGetGroupUseCase(),
        updateGroupUseCase: this.getUpdateGroupUseCase(),
        addMemberUseCase: this.getAddMemberUseCase(),
        removeMemberUseCase: this.getRemoveMemberUseCase(),
        updateMemberRoleUseCase: this.getUpdateMemberRoleUseCase(),
        searchGroupsUseCase: this.getSearchGroupsUseCase(),
        deleteGroupUseCase: this.getDeleteGroupUseCase(),
        createGroupEventUseCase: this.getCreateGroupEventUseCase()
      });
    }
    return this._instances.groupController;
  }

  // ============================================================================
  // ROUTES
  // ============================================================================

  getGroupRoutes() {
    return createGroupRoutes(this.getGroupController());
  }
}

module.exports = new GroupContainer();

