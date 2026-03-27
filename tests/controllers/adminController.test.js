const AdminController = require('../../src/modules/admin/admin.controller');

describe('AdminController', () => {
    let mockReq, mockRes;
    let mockListGroupsUseCase;
    let adminController;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            query: {},
            params: {},
            body: {}
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockListGroupsUseCase = {
            execute: jest.fn()
        };

        // Create controller with mocked dependencies
        adminController = new AdminController({
            listGroupsUseCase: mockListGroupsUseCase,
            // Add other dependencies as null or mock if needed
            getAdminHealthUseCase: null,
            listUsersUseCase: null,
            createAdminUserUseCase: null,
            updateUserRoleUseCase: null,
            listWithdrawalsUseCase: null,
            getWithdrawalDetailsUseCase: null
        });
    });

    describe('listGroups', () => {
        test('should list groups successfully', async () => {
            const mockResult = {
                groups: [{ id: 'group1', name: 'Test Group' }],
                pagination: { total: 1, page: 1, limit: 10, pages: 1 }
            };

            mockListGroupsUseCase.execute.mockResolvedValue(mockResult);

            mockReq.query = { limit: '10', page: '1' };

            await adminController.listGroups(mockReq, mockRes);

            expect(mockListGroupsUseCase.execute).toHaveBeenCalledWith({
                limit: '10',
                page: '1',
                isActive: undefined
            });
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockResult
                })
            );
        });

        test('should handle isActive filter', async () => {
            mockListGroupsUseCase.execute.mockResolvedValue({ groups: [] });

            mockReq.query = { isActive: 'true' };

            await adminController.listGroups(mockReq, mockRes);

            expect(mockListGroupsUseCase.execute).toHaveBeenCalledWith({
                limit: undefined,
                page: undefined,
                isActive: true
            });
        });
    });
});
