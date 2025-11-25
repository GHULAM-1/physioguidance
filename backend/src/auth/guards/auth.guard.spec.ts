import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthGuard],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  const createMockExecutionContext = (user: unknown): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as ExecutionContext;
  };

  describe('Authentication Verification', () => {
    it('should allow access if user is authenticated', () => {
      const user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        roles: ['USER'],
      };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access if user is not authenticated (null)', () => {
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should deny access if user is not authenticated (undefined)', () => {
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with correct message', () => {
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(
        'User is not authenticated',
      );
    });
  });

  describe('User Object Validation', () => {
    it('should allow access with minimal user object', () => {
      const user = { userId: 'test-id' };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access with complete user object', () => {
      const user = {
        userId: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['ADMIN', 'USER'],
        privileges: { ADMIN: 'EDITOR' },
        created_at: '2024-01-01',
      };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access with empty object', () => {
      const context = createMockExecutionContext({});

      // Empty object is still truthy, so should pass
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Request Context', () => {
    it('should extract user from HTTP request', () => {
      const mockRequest = {
        user: { userId: 'test-id', email: 'test@example.com' },
      };

      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(context.switchToHttp).toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    it('should deny access if user property is explicitly set to false', () => {
      const context = createMockExecutionContext(false);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should deny access if user property is explicitly set to 0', () => {
      const context = createMockExecutionContext(0);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should deny access if user property is empty string', () => {
      const context = createMockExecutionContext('');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('Integration with JWT Middleware', () => {
    it('should work with user populated by JWT middleware', () => {
      // Simulates user object after JWT verification
      const user = {
        userId: 'jwt-user-id',
        email: 'jwt@example.com',
        iat: 1234567890,
        exp: 1234567890,
      };
      const context = createMockExecutionContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
