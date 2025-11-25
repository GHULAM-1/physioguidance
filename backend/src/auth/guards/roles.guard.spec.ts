import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '../../bigquery/enums/roles.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
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

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext({ roles: [] });
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access if user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const user = { userId: 'test', roles: [Role.ADMIN] };
    const context = createMockExecutionContext(user);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access if user does not have required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const user = { userId: 'test', roles: [Role.USER] };
    const context = createMockExecutionContext(user);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should allow access if user has at least one of the required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN, Role.FINANCE]);

    const user = { userId: 'test', roles: [Role.ADMIN, Role.USER] };
    const context = createMockExecutionContext(user);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access if user has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const user = { userId: 'test', roles: [] };
    const context = createMockExecutionContext(user);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
