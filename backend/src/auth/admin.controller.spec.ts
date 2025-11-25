import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrivilegeGuard } from './guards/privilege.guard';
import { Role } from '../bigquery/enums/roles.enum';
import { Privilege } from '../bigquery/enums/privilege.enum';

describe('AdminController', () => {
  let controller: AdminController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    userId: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    roles: [Role.ADMIN],
    privileges: { [Role.ADMIN]: Privilege.EDITOR },
    created_at: '2024-01-01',
  };

  beforeEach(async () => {
    const mockAuthService = {
      createUserByAdmin: jest.fn(),
      getAllUsers: jest.fn(),
      getUsersByDepartment: jest.fn(),
      updateUserByAdmin: jest.fn(),
      deleteUserByAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: PrivilegeGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PrivilegeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        roles: [Role.USER],
        privileges: { [Role.USER]: Privilege.VIEWER },
      };

      authService.createUserByAdmin.mockResolvedValueOnce(mockUser);

      const result = await controller.createUser(createUserDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User created successfully');
      expect(result.data).not.toHaveProperty('password');
      expect(authService.createUserByAdmin).toHaveBeenCalledWith(createUserDto);
    });

    it('should not include password in response', async () => {
      const createUserDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        roles: [Role.ADMIN],
        privileges: { [Role.ADMIN]: Privilege.EDITOR },
      };

      authService.createUserByAdmin.mockResolvedValueOnce(mockUser);

      const result = await controller.createUser(createUserDto);

      expect(result.data).not.toHaveProperty('password');
      expect(result.data).toHaveProperty('userId');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without passwords', async () => {
      const mockUsers = [mockUser, { ...mockUser, userId: 'user2' }];

      authService.getAllUsers.mockResolvedValueOnce(mockUsers);

      const result = await controller.getAllUsers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(authService.getAllUsers).toHaveBeenCalled();
    });

    it('should return empty array if no users', async () => {
      authService.getAllUsers.mockResolvedValueOnce([]);

      const result = await controller.getAllUsers();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('getUsersByDepartment', () => {
    it('should return users for valid role', async () => {
      const mockUsers = [mockUser];

      authService.getUsersByDepartment.mockResolvedValueOnce(mockUsers);

      const result = await controller.getUsersByDepartment(Role.ADMIN);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(authService.getUsersByDepartment).toHaveBeenCalledWith(Role.ADMIN);
    });

    it('should return error for invalid role', async () => {
      const result = await controller.getUsersByDepartment('INVALID_ROLE');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid role specified');
      expect(authService.getUsersByDepartment).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
        password: 'newpassword',
        roles: [Role.ADMIN],
        privileges: { [Role.ADMIN]: Privilege.VIEWER },
      };

      const updatedUser = { ...mockUser, ...updateDto };
      authService.updateUserByAdmin.mockResolvedValueOnce(updatedUser);

      const result = await controller.updateUser('test-user-id', updateDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User updated successfully');
      expect(result.data).not.toHaveProperty('password');
      expect(result.data.name).toBe('Updated Name');
      expect(authService.updateUserByAdmin).toHaveBeenCalledWith(
        'test-user-id',
        updateDto,
      );
    });

    it('should not include password in response', async () => {
      const updateDto = {
        name: 'Updated Name',
        roles: [Role.ADMIN],
        privileges: { [Role.ADMIN]: Privilege.EDITOR },
      };

      authService.updateUserByAdmin.mockResolvedValueOnce(mockUser);

      const result = await controller.updateUser('test-user-id', updateDto);

      expect(result.data).not.toHaveProperty('password');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      authService.deleteUserByAdmin.mockResolvedValueOnce(undefined);

      const result = await controller.deleteUser('test-user-id');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User deleted successfully');
      expect(authService.deleteUserByAdmin).toHaveBeenCalledWith(
        'test-user-id',
      );
    });
  });
});
