import { RoleTableGenerator } from './role-table.generator';
import { Role } from '../enums/roles.enum';

describe('RoleTableGenerator', () => {
  describe('getRoleTableSchema', () => {
    it('should return standard role table schema', () => {
      const schema = RoleTableGenerator.getRoleTableSchema();

      expect(schema).toHaveLength(3);
      expect(schema[0]).toEqual({
        name: 'userId',
        type: 'STRING',
        mode: 'REQUIRED',
      });
      expect(schema[1]).toEqual({
        name: 'privilege',
        type: 'STRING',
        mode: 'REQUIRED',
      });
      expect(schema[2]).toEqual({
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
      });
    });

    it('should always return same schema structure', () => {
      const schema1 = RoleTableGenerator.getRoleTableSchema();
      const schema2 = RoleTableGenerator.getRoleTableSchema();

      expect(schema1).toEqual(schema2);
    });
  });

  describe('generateAllRoleTableSchemas', () => {
    it('should generate schemas for all roles in enum', () => {
      const schemas = RoleTableGenerator.generateAllRoleTableSchemas();

      // Should have schema for each role
      const roleCount = Object.values(Role).length;
      const schemaKeys = Object.keys(schemas);

      expect(schemaKeys.length).toBe(roleCount);
    });

    it('should use lowercase table names', () => {
      const schemas = RoleTableGenerator.generateAllRoleTableSchemas();

      Object.keys(schemas).forEach((tableName) => {
        expect(tableName).toBe(tableName.toLowerCase());
      });
    });

    it('should generate correct table names from enum', () => {
      const schemas = RoleTableGenerator.generateAllRoleTableSchemas();

      expect(schemas).toHaveProperty('user');
      expect(schemas).toHaveProperty('learner');
      expect(schemas).toHaveProperty('admin');
      expect(schemas).toHaveProperty('finance');
    });

    it('should use standard schema for all role tables', () => {
      const schemas = RoleTableGenerator.generateAllRoleTableSchemas();
      const standardSchema = RoleTableGenerator.getRoleTableSchema();

      Object.values(schemas).forEach((schema) => {
        expect(schema).toEqual(standardSchema);
      });
    });
  });

  describe('getExpectedTableNames', () => {
    it('should return all expected table names', () => {
      const tableNames = RoleTableGenerator.getExpectedTableNames();

      expect(tableNames).toBeInstanceOf(Array);
      expect(tableNames.length).toBe(Object.values(Role).length);
    });

    it('should return lowercase table names', () => {
      const tableNames = RoleTableGenerator.getExpectedTableNames();

      tableNames.forEach((name) => {
        expect(name).toBe(name.toLowerCase());
      });
    });

    it('should include all role table names', () => {
      const tableNames = RoleTableGenerator.getExpectedTableNames();

      expect(tableNames).toContain('user');
      expect(tableNames).toContain('learner');
      expect(tableNames).toContain('admin');
      expect(tableNames).toContain('finance');
    });

    it('should match keys from generateAllRoleTableSchemas', () => {
      const tableNames = RoleTableGenerator.getExpectedTableNames();
      const schemas = RoleTableGenerator.generateAllRoleTableSchemas();
      const schemaKeys = Object.keys(schemas);

      expect(tableNames.sort()).toEqual(schemaKeys.sort());
    });
  });

  describe('ENUM-driven behavior', () => {
    it('should dynamically adapt if Role enum changes', () => {
      // This test verifies that the generator reads from the enum
      const roleCount = Object.values(Role).length;
      const tableNames = RoleTableGenerator.getExpectedTableNames();

      expect(tableNames.length).toBe(roleCount);
    });

    it('should generate schema for each enum value', () => {
      const schemas = RoleTableGenerator.generateAllRoleTableSchemas();
      const roles = Object.values(Role);

      roles.forEach((role) => {
        const tableName = role.toLowerCase();
        expect(schemas).toHaveProperty(tableName);
      });
    });
  });
});
