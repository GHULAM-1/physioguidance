import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { BigQueryService } from '../bigquery/bigquery.service';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '../bigquery/enums/roles.enum';
import { Privilege } from '../bigquery/enums/privilege.enum';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let bigQueryService: jest.Mocked<BigQueryService>;

  const mockUser = {
    userId: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    roles: [Role.LEARNER],
    privileges: { [Role.LEARNER]: Privilege.VIEWER },
    created_at: '2024-01-01',
  };

  beforeEach(async () => {
    const mockBigQueryService = {
      getUserByEmail: jest.fn(),
      getUserByEmailWithPrivileges: jest.fn(),
      getUserById: jest.fn(),
      createUser: jest.fn(),
      assignUserToRole: jest.fn(),
      getAllUsers: jest.fn(),
      getAllUsersWithPrivileges: jest.fn(),
      getUsersByRole: jest.fn(),
      updateUser: jest.fn(),
      updateUserRolesAndPrivileges: jest.fn(),
      deleteUser: jest.fn(),
      getUserByEmailExcludingUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: BigQueryService,
          useValue: mockBigQueryService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    bigQueryService = module.get(BigQueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      };

      const expectedUser = {
        userId: 'new-user-id',
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        roles: [Role.LEARNER],
        privileges: { [Role.LEARNER]: Privilege.VIEWER },
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await service.register(registerDto);

      expect(result.email).toBe(registerDto.email);
      expect(result.roles).toContain(Role.LEARNER);
      expect(bigQueryService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: registerDto.name,
          email: registerDto.email,
          roles: [Role.LEARNER],
          privileges: { [Role.LEARNER]: Privilege.VIEWER },
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      bigQueryService.getUserByEmailWithPrivileges.mockResolvedValueOnce(
        mockUser,
      );

      const result = await service.login(loginDto);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      bigQueryService.getUserByEmailWithPrivileges.mockResolvedValueOnce(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      bigQueryService.getUserByEmailWithPrivileges.mockResolvedValueOnce(
        mockUser,
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createUserByAdmin', () => {
    it('should create user with multiple roles and privileges', async () => {
      const createUserDto = {
        name: 'Admin Created User',
        email: 'admin-created@example.com',
        password: 'password123',
        roles: [Role.ADMIN, Role.FINANCE],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR,
          [Role.FINANCE]: Privilege.VIEWER,
        },
      };

      const expectedUser = {
        userId: 'admin-user-id',
        ...createUserDto,
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await service.createUserByAdmin(createUserDto);

      expect(result.email).toBe(createUserDto.email);
      expect(result.roles).toEqual(createUserDto.roles);
      expect(bigQueryService.createUser).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException if email exists', async () => {
      const createUserDto = {
        name: 'Test',
        email: 'existing@example.com',
        password: 'password123',
        roles: [Role.USER],
        privileges: { [Role.USER]: Privilege.VIEWER },
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(mockUser);

      await expect(service.createUserByAdmin(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if privilege missing for role', async () => {
      const createUserDto = {
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
        roles: [Role.ADMIN, Role.FINANCE],
        privileges: { [Role.ADMIN]: Privilege.EDITOR },
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);

      await expect(service.createUserByAdmin(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateUserByAdmin', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
        password: 'newpassword',
        roles: [Role.ADMIN],
        privileges: { [Role.ADMIN]: Privilege.EDITOR },
      };

      bigQueryService.getUserById.mockResolvedValueOnce(mockUser);
      bigQueryService.getUserByEmailExcludingUserId.mockResolvedValueOnce(null);
      bigQueryService.updateUserRolesAndPrivileges.mockResolvedValueOnce(
        undefined,
      );
      bigQueryService.updateUser.mockResolvedValueOnce({
        ...mockUser,
        ...updateDto,
      });

      const result = await service.updateUserByAdmin('test-user-id', updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(bigQueryService.updateUserRolesAndPrivileges).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      const updateDto = { name: 'Test' };

      bigQueryService.getUserById.mockResolvedValueOnce(null);

      await expect(
        service.updateUserByAdmin('nonexistent-id', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email already used', async () => {
      const updateDto = { email: 'existing@example.com' };

      bigQueryService.getUserById.mockResolvedValueOnce(mockUser);
      bigQueryService.getUserByEmailExcludingUserId.mockResolvedValueOnce({
        ...mockUser,
        userId: 'different-user-id',
      });

      await expect(
        service.updateUserByAdmin('test-user-id', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should not include password in updateData if empty string provided', async () => {
      const updateDto = {
        name: 'Updated Name',
        password: '',
        roles: [Role.USER],
        privileges: { [Role.USER]: Privilege.VIEWER },
      };

      bigQueryService.getUserById.mockResolvedValueOnce(mockUser);
      bigQueryService.getUserByEmailExcludingUserId.mockResolvedValueOnce(null);
      bigQueryService.updateUserRolesAndPrivileges.mockResolvedValueOnce(
        undefined,
      );
      bigQueryService.updateUser.mockResolvedValueOnce({
        ...mockUser,
        name: 'Updated Name',
      });

      await service.updateUserByAdmin('test-user-id', updateDto);

      // updateUser should be called with name but NOT password
      expect(bigQueryService.updateUser).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          name: 'Updated Name',
        }),
      );
      // Verify password is not in the update data
      const updateCall = bigQueryService.updateUser.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('password');
    });
  });

  describe('deleteUserByAdmin', () => {
    it('should delete user successfully', async () => {
      bigQueryService.getUserById.mockResolvedValueOnce(mockUser);
      bigQueryService.deleteUser.mockResolvedValueOnce(undefined);

      await service.deleteUserByAdmin('test-user-id');

      expect(bigQueryService.deleteUser).toHaveBeenCalledWith('test-user-id');
    });

    it('should throw BadRequestException if user not found', async () => {
      bigQueryService.getUserById.mockResolvedValueOnce(null);

      await expect(service.deleteUserByAdmin('nonexistent-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with privileges', async () => {
      const mockUsers = [mockUser];
      bigQueryService.getAllUsersWithPrivileges.mockResolvedValueOnce(
        mockUsers,
      );

      const result = await service.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(bigQueryService.getAllUsersWithPrivileges).toHaveBeenCalled();
    });
  });

  describe('getUsersByDepartment', () => {
    it('should return users by role', async () => {
      const mockUsers = [mockUser];
      bigQueryService.getUsersByRole.mockResolvedValueOnce(mockUsers);

      const result = await service.getUsersByDepartment(Role.LEARNER);

      expect(result).toEqual(mockUsers);
      expect(bigQueryService.getUsersByRole).toHaveBeenCalledWith(Role.LEARNER);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      const mockToken = 'mock-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValueOnce(mockToken);

      const result = service.generateToken(mockUser);

      expect(result).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.userId,
          email: mockUser.email,
        }),
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
