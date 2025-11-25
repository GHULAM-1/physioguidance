import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { BigQueryService } from '../bigquery/bigquery.service';
import { Role } from '../bigquery/enums/roles.enum';
import { Privilege } from '../bigquery/enums/privilege.enum';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

/**
 * RBAC + PBAC Integration Tests
 *
 * These tests validate the full two-tier authorization system:
 * Tier 1: Role-Based Access Control (RBAC)
 * Tier 2: Privilege-Based Access Control (PBAC)
 */
describe('RBAC + PBAC Integration Tests', () => {
  let authService: AuthService;
  let bigQueryService: jest.Mocked<BigQueryService>;

  beforeEach(async () => {
    const mockBigQueryService = {
      getUserByEmail: jest.fn(),
      getUserByEmailWithPrivileges: jest.fn(),
      createUser: jest.fn(),
      getUserById: jest.fn(),
      updateUserRolesAndPrivileges: jest.fn(),
      updateUser: jest.fn(),
      getUserByEmailExcludingUserId: jest.fn(),
      deleteUser: jest.fn(),
      getAllUsersWithPrivileges: jest.fn(),
      getUsersByRole: jest.fn(),
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

    authService = module.get<AuthService>(AuthService);
    bigQueryService = module.get(BigQueryService);
  });

  describe('Scenario 1: Single Role with Single Privilege', () => {
    it('should create user with ADMIN role and EDITOR privilege', async () => {
      const createUserDto = {
        name: 'Admin Editor',
        email: 'admin-editor@example.com',
        password: 'password123',
        roles: [Role.ADMIN],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR,
        },
      };

      const expectedUser = {
        userId: 'user-1',
        ...createUserDto,
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await authService.createUserByAdmin(createUserDto);

      expect(result.roles).toEqual([Role.ADMIN]);
      expect(result.privileges[Role.ADMIN]).toBe(Privilege.EDITOR);
    });

    it('should create user with ADMIN role and VIEWER privilege', async () => {
      const createUserDto = {
        name: 'Admin Viewer',
        email: 'admin-viewer@example.com',
        password: 'password123',
        roles: [Role.ADMIN],
        privileges: {
          [Role.ADMIN]: Privilege.VIEWER,
        },
      };

      const expectedUser = {
        userId: 'user-2',
        ...createUserDto,
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await authService.createUserByAdmin(createUserDto);

      expect(result.privileges[Role.ADMIN]).toBe(Privilege.VIEWER);
    });
  });

  describe('Scenario 2: Multi-Role with Different Privileges', () => {
    it('should create user with ADMIN (EDITOR) and FINANCE (VIEWER)', async () => {
      const createUserDto = {
        name: 'Multi Role User',
        email: 'multi@example.com',
        password: 'password123',
        roles: [Role.ADMIN, Role.FINANCE],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR,
          [Role.FINANCE]: Privilege.VIEWER,
        },
      };

      const expectedUser = {
        userId: 'user-3',
        ...createUserDto,
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await authService.createUserByAdmin(createUserDto);

      // Verify role-privilege mapping
      expect(result.roles).toContain(Role.ADMIN);
      expect(result.roles).toContain(Role.FINANCE);
      expect(result.privileges[Role.ADMIN]).toBe(Privilege.EDITOR);
      expect(result.privileges[Role.FINANCE]).toBe(Privilege.VIEWER);
    });

    it('should create user with all roles and mixed privileges', async () => {
      const createUserDto = {
        name: 'Super User',
        email: 'super@example.com',
        password: 'password123',
        roles: [Role.ADMIN, Role.FINANCE, Role.USER, Role.LEARNER],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR,
          [Role.FINANCE]: Privilege.EDITOR,
          [Role.USER]: Privilege.VIEWER,
          [Role.LEARNER]: Privilege.VIEWER,
        },
      };

      const expectedUser = {
        userId: 'user-4',
        ...createUserDto,
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await authService.createUserByAdmin(createUserDto);

      expect(result.roles).toHaveLength(4);
      expect(result.privileges[Role.ADMIN]).toBe(Privilege.EDITOR);
      expect(result.privileges[Role.FINANCE]).toBe(Privilege.EDITOR);
      expect(result.privileges[Role.USER]).toBe(Privilege.VIEWER);
      expect(result.privileges[Role.LEARNER]).toBe(Privilege.VIEWER);
    });
  });

  describe('Scenario 3: Role-Privilege Validation', () => {
    it('should reject user creation if privilege is missing for a role', async () => {
      const createUserDto = {
        name: 'Invalid User',
        email: 'invalid@example.com',
        password: 'password123',
        roles: [Role.ADMIN, Role.FINANCE],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR,
          // Missing FINANCE privilege!
        },
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);

      await expect(
        authService.createUserByAdmin(createUserDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept user with all required privileges', async () => {
      const createUserDto = {
        name: 'Valid User',
        email: 'valid@example.com',
        password: 'password123',
        roles: [Role.ADMIN, Role.FINANCE, Role.USER],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR,
          [Role.FINANCE]: Privilege.VIEWER,
          [Role.USER]: Privilege.VIEWER,
        },
      };

      const expectedUser = {
        userId: 'user-5',
        ...createUserDto,
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await authService.createUserByAdmin(createUserDto);

      expect(result).toBeDefined();
      expect(Object.keys(result.privileges)).toHaveLength(3);
    });
  });

  describe('Scenario 4: Privilege Escalation/Demotion', () => {
    it('should update user privilege from VIEWER to EDITOR', async () => {
      const existingUser = {
        userId: 'user-6',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.ADMIN],
        privileges: { [Role.ADMIN]: Privilege.VIEWER },
        created_at: '2024-01-01',
      };

      const updateDto = {
        roles: [Role.ADMIN],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR, // Escalate to EDITOR
        },
      };

      bigQueryService.getUserById.mockResolvedValueOnce(existingUser);
      bigQueryService.getUserByEmailExcludingUserId.mockResolvedValueOnce(null);
      bigQueryService.updateUserRolesAndPrivileges.mockResolvedValueOnce(
        undefined,
      );
      bigQueryService.getUserById.mockResolvedValueOnce({
        ...existingUser,
        privileges: { [Role.ADMIN]: Privilege.EDITOR },
      });

      const result = await authService.updateUserByAdmin('user-6', updateDto);

      expect(result.privileges[Role.ADMIN]).toBe(Privilege.EDITOR);
    });

    it('should update user privilege from EDITOR to VIEWER (demotion)', async () => {
      const existingUser = {
        userId: 'user-7',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.ADMIN],
        privileges: { [Role.ADMIN]: Privilege.EDITOR },
        created_at: '2024-01-01',
      };

      const updateDto = {
        roles: [Role.ADMIN],
        privileges: {
          [Role.ADMIN]: Privilege.VIEWER, // Demote to VIEWER
        },
      };

      bigQueryService.getUserById.mockResolvedValueOnce(existingUser);
      bigQueryService.getUserByEmailExcludingUserId.mockResolvedValueOnce(null);
      bigQueryService.updateUserRolesAndPrivileges.mockResolvedValueOnce(
        undefined,
      );
      bigQueryService.getUserById.mockResolvedValueOnce({
        ...existingUser,
        privileges: { [Role.ADMIN]: Privilege.VIEWER },
      });

      const result = await authService.updateUserByAdmin('user-7', updateDto);

      expect(result.privileges[Role.ADMIN]).toBe(Privilege.VIEWER);
    });
  });

  describe('Scenario 5: Role Addition/Removal with Privileges', () => {
    it('should add new role with privilege to existing user', async () => {
      const existingUser = {
        userId: 'user-8',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.USER],
        privileges: { [Role.USER]: Privilege.VIEWER },
        created_at: '2024-01-01',
      };

      const updateDto = {
        roles: [Role.USER, Role.ADMIN], // Add ADMIN role
        privileges: {
          [Role.USER]: Privilege.VIEWER,
          [Role.ADMIN]: Privilege.EDITOR, // New privilege
        },
      };

      bigQueryService.getUserById.mockResolvedValueOnce(existingUser);
      bigQueryService.getUserByEmailExcludingUserId.mockResolvedValueOnce(null);
      bigQueryService.updateUserRolesAndPrivileges.mockResolvedValueOnce(
        undefined,
      );
      bigQueryService.getUserById.mockResolvedValueOnce({
        ...existingUser,
        roles: [Role.USER, Role.ADMIN],
        privileges: {
          [Role.USER]: Privilege.VIEWER,
          [Role.ADMIN]: Privilege.EDITOR,
        },
      });

      const result = await authService.updateUserByAdmin('user-8', updateDto);

      expect(result.roles).toContain(Role.ADMIN);
      expect(result.privileges[Role.ADMIN]).toBe(Privilege.EDITOR);
    });

    it('should remove role and its privilege from user', async () => {
      const existingUser = {
        userId: 'user-9',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        roles: [Role.USER, Role.ADMIN],
        privileges: {
          [Role.USER]: Privilege.VIEWER,
          [Role.ADMIN]: Privilege.EDITOR,
        },
        created_at: '2024-01-01',
      };

      const updateDto = {
        roles: [Role.USER], // Remove ADMIN role
        privileges: {
          [Role.USER]: Privilege.VIEWER,
        },
      };

      bigQueryService.getUserById.mockResolvedValueOnce(existingUser);
      bigQueryService.getUserByEmailExcludingUserId.mockResolvedValueOnce(null);
      bigQueryService.updateUserRolesAndPrivileges.mockResolvedValueOnce(
        undefined,
      );
      bigQueryService.getUserById.mockResolvedValueOnce({
        ...existingUser,
        roles: [Role.USER],
        privileges: { [Role.USER]: Privilege.VIEWER },
      });

      const result = await authService.updateUserByAdmin('user-9', updateDto);

      expect(result.roles).not.toContain(Role.ADMIN);
      expect(result.privileges).not.toHaveProperty(Role.ADMIN);
    });
  });

  describe('Scenario 6: Self-Registration with Default Role/Privilege', () => {
    it('should auto-assign LEARNER role with VIEWER privilege on registration', async () => {
      const registerDto = {
        name: 'New Learner',
        email: 'learner@example.com',
        password: 'password123',
      };

      const expectedUser = {
        userId: 'user-10',
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        roles: [Role.LEARNER],
        privileges: { [Role.LEARNER]: Privilege.VIEWER },
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await authService.register(registerDto);

      expect(result.roles).toEqual([Role.LEARNER]);
      expect(result.privileges[Role.LEARNER]).toBe(Privilege.VIEWER);
    });
  });

  describe('Scenario 7: Complex Department Access Patterns', () => {
    it('should handle user with EDITOR in one dept and VIEWER in another', async () => {
      const createUserDto = {
        name: 'Mixed Privilege User',
        email: 'mixed@example.com',
        password: 'password123',
        roles: [Role.ADMIN, Role.FINANCE, Role.USER],
        privileges: {
          [Role.ADMIN]: Privilege.EDITOR, // Can edit admin data
          [Role.FINANCE]: Privilege.VIEWER, // Can only view finance data
          [Role.USER]: Privilege.VIEWER, // Can only view user data
        },
      };

      const expectedUser = {
        userId: 'user-11',
        ...createUserDto,
        created_at: '2024-01-01',
      };

      bigQueryService.getUserByEmail.mockResolvedValueOnce(null);
      bigQueryService.createUser.mockResolvedValueOnce(expectedUser);

      const result = await authService.createUserByAdmin(createUserDto);

      // Verify correct privilege mapping
      expect(result.privileges[Role.ADMIN]).toBe(Privilege.EDITOR);
      expect(result.privileges[Role.FINANCE]).toBe(Privilege.VIEWER);
      expect(result.privileges[Role.USER]).toBe(Privilege.VIEWER);
    });
  });
});
