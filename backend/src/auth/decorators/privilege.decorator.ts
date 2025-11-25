import { SetMetadata } from '@nestjs/common';
import { Privilege } from '../../bigquery/enums/privilege.enum';

export const PRIVILEGE_KEY = 'privilege';
export const RequirePrivilege = (privilege: Privilege) =>
  SetMetadata(PRIVILEGE_KEY, privilege);
