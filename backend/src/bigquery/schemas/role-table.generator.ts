import { Role, getRoleTableName } from '../enums/roles.enum';

/**
 * RoleTableGenerator - Dynamically generates table schemas from Role ENUM
 *
 * This makes the Role ENUM the single source of truth for all department tables.
 * Adding/removing roles from the ENUM automatically affects table management.
 */
export class RoleTableGenerator {
  /**
   * Returns the standard schema template for all role/department tables
   * All role tables follow the same structure: userId, privilege, created_at
   */
  static getRoleTableSchema() {
    return [
      { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
      { name: 'privilege', type: 'STRING', mode: 'REQUIRED' }, // EDITOR or VIEWER
      { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    ];
  }

  /**
   * Generates schemas for ALL roles defined in the Role ENUM
   * Returns a map of table names to their schemas
   *
   * Example output:
   * {
   *   'admin': [{ name: 'userId', ... }, ...],
   *   'finance': [{ name: 'userId', ... }, ...],
   *   'learner': [{ name: 'userId', ... }, ...],
   *   'user': [{ name: 'userId', ... }, ...]
   * }
   */
  static generateAllRoleTableSchemas(): Record<string, any[]> {
    const schemas: Record<string, any[]> = {};

    // Loop through all Role enum values
    Object.values(Role).forEach((role) => {
      const tableName = getRoleTableName(role);
      schemas[tableName] = this.getRoleTableSchema();
    });

    return schemas;
  }

  /**
   * Get list of all expected table names from the Role ENUM
   * Useful for validation - checking if all required tables exist
   *
   * Example output: ['admin', 'finance', 'learner', 'user']
   */
  static getExpectedTableNames(): string[] {
    return Object.values(Role).map((role) => getRoleTableName(role));
  }

  /**
   * Get the users table schema (common data for all users)
   * This table stores data shared across all departments
   */
  static getUsersTableSchema() {
    return [
      { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
      { name: 'name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'email', type: 'STRING', mode: 'REQUIRED' },
      { name: 'password', type: 'STRING', mode: 'REQUIRED' },
      { name: 'roles', type: 'STRING', mode: 'REPEATED' }, // Array of Role enum values
      { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    ];
  }
}
