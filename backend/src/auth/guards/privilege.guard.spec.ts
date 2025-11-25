import { Test, TestingModule } from '@nestjs/testing';
import { PrivilegeGuard } from './privilege.guard';
import { BigQueryService } from '../../bigquery/bigquery.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '../../bigquery/enums/roles.enum';
import { Privilege } from '../../bigquery/enums/privilege.enum';

describe('PrivilegeGuard', () => {
  let guard: PrivilegeGuard;
  let bigQueryService: jest.Mocked<BigQueryService>;
  let reflector: Reflector;

  beforeEach(async () => {
    const mockBigQueryService = {
      getUserPrivilegeForRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivilegeGuard,
        Reflector,
        {
          provide: BigQueryService,
          useValue: mockBigQueryService,
        },
      ],
    }).compile();

    guard = module.get<PrivilegeGuard>(PrivilegeGuard);
    bigQueryService = module.get(BigQueryService);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (user: unknown): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as ExecutionContext;
  };

  describe('PBAC - Privilege-Based Access Control', () => {
    it('should allow access if no privilege is required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const user = { userId: 'test', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(bigQueryService.getUserPrivilegeForRole).not.toHaveBeenCalled();
    });

    it('should allow access if user has EDITOR privilege', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(Privilege.EDITOR) // First call: requiredPrivilege
        .mockReturnValueOnce(undefined); // Second call: requiredRoles

      const user = { userId: 'test-user', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.EDITOR,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(bigQueryService.getUserPrivilegeForRole).toHaveBeenCalledWith(
        'test-user',
        Role.ADMIN,
      );
    });

    it('should deny access if user has VIEWER privilege but EDITOR is required', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(Privilege.EDITOR);

      const user = { userId: 'test-user', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.VIEWER,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User does not have required privilege',
      );
    });

    it('should deny access if user has no privilege for the role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(Privilege.EDITOR);

      const user = { userId: 'test-user', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User does not have required privilege',
      );
    });

    it('should check privilege for the first role in user roles array', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(Privilege.EDITOR) // First call: requiredPrivilege
        .mockReturnValueOnce(undefined); // Second call: requiredRoles

      const user = {
        userId: 'test-user',
        roles: [Role.ADMIN, Role.FINANCE, Role.USER],
      };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.EDITOR,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should check the first role
      expect(bigQueryService.getUserPrivilegeForRole).toHaveBeenCalledWith(
        'test-user',
        Role.ADMIN,
      );
    });

    it('should deny access if user has no roles', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(Privilege.EDITOR);

      const user = { userId: 'test-user', roles: [] };
      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User does not have required privilege',
      );
    });
  });

  describe('RBAC + PBAC Combined Scenarios', () => {
    it('should enforce privilege even if user has correct role', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(Privilege.EDITOR);

      const user = { userId: 'admin-user', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      // User has ADMIN role but only VIEWER privilege
      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.VIEWER,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User does not have required privilege',
      );
    });

    it('should allow VIEWER privilege when VIEWER is required', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(Privilege.VIEWER) // First call: requiredPrivilege
        .mockReturnValueOnce(undefined); // Second call: requiredRoles

      const user = { userId: 'test-user', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.VIEWER,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow EDITOR when VIEWER is required (escalated privilege)', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(Privilege.VIEWER) // First call: requiredPrivilege
        .mockReturnValueOnce(undefined); // Second call: requiredRoles

      const user = { userId: 'test-user', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      // User has EDITOR (higher privilege)
      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.EDITOR,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Multi-Department Scenarios', () => {
    it('should check privilege for ADMIN role when user has multiple roles', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(Privilege.EDITOR) // First call: requiredPrivilege
        .mockReturnValueOnce(undefined); // Second call: requiredRoles

      const user = {
        userId: 'multi-role-user',
        roles: [Role.ADMIN, Role.FINANCE],
      };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.EDITOR,
      );

      await guard.canActivate(context);

      expect(bigQueryService.getUserPrivilegeForRole).toHaveBeenCalledWith(
        'multi-role-user',
        Role.ADMIN,
      );
    });

    it('should handle user with different privileges in different departments', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(Privilege.EDITOR);

      const user = {
        userId: 'mixed-privilege-user',
        roles: [Role.FINANCE], // VIEWER in FINANCE
      };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockResolvedValueOnce(
        Privilege.VIEWER,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User does not have required privilege',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(Privilege.EDITOR) // First call: requiredPrivilege
        .mockReturnValueOnce(undefined); // Second call: requiredRoles

      const user = { userId: 'test-user', roles: [Role.ADMIN] };
      const context = createMockExecutionContext(user);

      bigQueryService.getUserPrivilegeForRole.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle missing user object in request', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(Privilege.EDITOR);

      const context = createMockExecutionContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow();
    });
  });
});
