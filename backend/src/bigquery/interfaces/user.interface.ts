import { Role } from '../enums/roles.enum';
import { Privilege } from '../enums/privilege.enum';

export interface User {
  userId: string;
  name: string;
  email: string;
  password: string;
  roles: Role[];
  created_at: string;
}

export interface RolePrivilege {
  userId: string;
  privilege: Privilege;
  created_at: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  privileges: Record<Role, Privilege>; // Map each role to its privilege
}
