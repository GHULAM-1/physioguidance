import { Role } from '../../bigquery/enums/roles.enum';
import { Privilege } from '../../bigquery/enums/privilege.enum';

export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  privileges: Record<Role, Privilege>;
}
