import { Role } from '../../bigquery/enums/roles.enum';
import { Privilege } from '../../bigquery/enums/privilege.enum';

export type User = {
  userId: string;
  name: string;
  email: string;
  password: string;
  roles: Role[];
  privileges?: Record<Role, Privilege>; // Optional: Map each role to its privilege
  created_at: string;
};
