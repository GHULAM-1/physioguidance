import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PRIVILEGE_KEY } from '../decorators/privilege.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Privilege } from '../../bigquery/enums/privilege.enum';
import { Role } from '../../bigquery/enums/roles.enum';
import { User } from '../../types/auth/type';
import { BigQueryService } from '../../bigquery/bigquery.service';

@Injectable()
export class PrivilegeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private bigQueryService: BigQueryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPrivilege = this.reflector.getAllAndOverride<Privilege>(
      PRIVILEGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPrivilege) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check privilege for each required role
    const rolesToCheck = requiredRoles || user.roles;

    if (!rolesToCheck || rolesToCheck.length === 0) {
      throw new ForbiddenException(
        `User does not have required privilege: ${requiredPrivilege}`,
      );
    }

    for (const role of rolesToCheck) {
      if (user.roles.includes(role)) {
        const userPrivilege =
          await this.bigQueryService.getUserPrivilegeForRole(user.userId, role);

        // Check if user has the required privilege
        // EDITOR can do everything VIEWER can do (privilege escalation)
        if (userPrivilege === requiredPrivilege) {
          return true;
        }
        if (
          requiredPrivilege === Privilege.VIEWER &&
          userPrivilege === Privilege.EDITOR
        ) {
          return true;
        }
      }
    }

    throw new ForbiddenException(
      `User does not have required privilege: ${requiredPrivilege}`,
    );
  }
}
