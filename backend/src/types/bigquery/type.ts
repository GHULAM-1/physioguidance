import { Privilege } from '../../bigquery/enums/privilege.enum';

export type RolePrivilege = {
  userId: string;
  privilege: Privilege;
  created_at: string;
};

export type MigrationResult = {
  created: string[];
  failed: Array<{ table: string; error: string }>;
};

export type ValidationResult = {
  allTablesExist: boolean;
  missingTables: string[];
  existingTables: string[];
  usersTableExists: boolean;
};
