import { Role } from '../../bigquery/enums/roles.enum';
import { Privilege } from '../../bigquery/enums/privilege.enum';

export class UpdateUserDto {
  name?: string;
  email?: string;
  password?: string; // Optional - only update if provided
  roles?: Role[];
  privileges?: Record<Role, Privilege>;
}
