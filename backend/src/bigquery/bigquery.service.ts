import { Injectable } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { v4 as uuidv4 } from 'uuid';
import { Role, getRoleTableName } from './enums/roles.enum';
import { Privilege } from './enums/privilege.enum';
import { User, CreateUserDto } from './interfaces/user.interface';

@Injectable()
export class BigQueryService {
  private bigquery: BigQuery;
  private datasetId: string;

  constructor() {
    this.bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID || 'test-project',
      apiEndpoint:
        process.env.BIGQUERY_EMULATOR_HOST || 'http://localhost:9050',
    });
    this.datasetId = process.env.BIGQUERY_DATASET_ID || 'test_dataset';
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const userId = uuidv4();
    const created_at = new Date().toISOString();

    // Insert into users table
    const user: User = {
      userId,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      roles: userData.roles,
      created_at,
    };

    await this.bigquery.dataset(this.datasetId).table('users').insert([user]);

    // Insert into each role-specific table with privileges
    for (const role of userData.roles) {
      const roleTableName = getRoleTableName(role);
      const privilege = userData.privileges[role];

      await this.bigquery.dataset(this.datasetId).table(roleTableName).insert([
        {
          userId,
          privilege,
          created_at,
        },
      ]);
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT * FROM \`${this.datasetId}.users\`
      WHERE email = @email
      LIMIT 1
    `;

    const options = {
      query,
      params: { email },
    };

    const [rows] = await this.bigquery.query(options);
    return rows.length > 0 ? (rows[0] as User) : null;
  }

  async getUserById(userId: string): Promise<User | null> {
    const query = `
      SELECT * FROM \`${this.datasetId}.users\`
      WHERE userId = @userId
      LIMIT 1
    `;

    const options = {
      query,
      params: { userId },
    };

    const [rows] = await this.bigquery.query(options);
    return rows.length > 0 ? (rows[0] as User) : null;
  }

  async getUserPrivilegeForRole(
    userId: string,
    role: Role,
  ): Promise<Privilege | null> {
    const roleTableName = getRoleTableName(role);
    const query = `
      SELECT privilege FROM \`${this.datasetId}.${roleTableName}\`
      WHERE userId = @userId
      LIMIT 1
    `;

    const options = {
      query,
      params: { userId },
    };

    const [rows] = await this.bigquery.query(options);
    return rows.length > 0 ? (rows[0].privilege as Privilege) : null;
  }

  async getAllUsers(): Promise<User[]> {
    const query = `
      SELECT * FROM \`${this.datasetId}.users\`
      ORDER BY created_at DESC
    `;

    const [rows] = await this.bigquery.query({ query });
    return rows as User[];
  }

  async getUsersByRole(role: Role): Promise<User[]> {
    const roleTableName = getRoleTableName(role);
    const query = `
      SELECT u.*
      FROM \`${this.datasetId}.users\` u
      JOIN \`${this.datasetId}.${roleTableName}\` r
      ON u.userId = r.userId
      ORDER BY u.created_at DESC
    `;

    const [rows] = await this.bigquery.query({ query });
    return rows as User[];
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    // Build UPDATE query dynamically based on provided fields
    const fieldsToUpdate: string[] = [];
    const params: any = { userId };

    if (updateData.name !== undefined) {
      fieldsToUpdate.push('name = @name');
      params.name = updateData.name;
    }

    if (updateData.email !== undefined) {
      fieldsToUpdate.push('email = @email');
      params.email = updateData.email;
    }

    if (updateData.password !== undefined) {
      fieldsToUpdate.push('password = @password');
      params.password = updateData.password;
    }

    if (updateData.roles !== undefined) {
      fieldsToUpdate.push('roles = @roles');
      params.roles = updateData.roles;
    }

    if (fieldsToUpdate.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE \`${this.datasetId}.users\`
      SET ${fieldsToUpdate.join(', ')}
      WHERE userId = @userId
    `;

    await this.bigquery.query({ query, params });

    // Return updated user
    const updatedUser = await this.getUserById(userId);
    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    return updatedUser;
  }

  async updateUserRolesAndPrivileges(
    userId: string,
    newRoles: Role[],
    newPrivileges: Record<Role, Privilege>,
  ): Promise<void> {
    // Get current user to find existing roles
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldRoles = user.roles;

    // Delete from role tables that are no longer assigned
    const rolesToRemove = oldRoles.filter((role) => !newRoles.includes(role));
    for (const role of rolesToRemove) {
      const roleTableName = getRoleTableName(role);
      const deleteQuery = `
        DELETE FROM \`${this.datasetId}.${roleTableName}\`
        WHERE userId = @userId
      `;
      await this.bigquery.query({ query: deleteQuery, params: { userId } });
    }

    // Insert into new role tables
    const rolesToAdd = newRoles.filter((role) => !oldRoles.includes(role));
    const created_at = new Date().toISOString();

    for (const role of rolesToAdd) {
      const roleTableName = getRoleTableName(role);
      const privilege = newPrivileges[role];

      await this.bigquery
        .dataset(this.datasetId)
        .table(roleTableName)
        .insert([{ userId, privilege, created_at }]);
    }

    // Update privileges for existing roles (if privilege changed)
    const rolesToUpdate = newRoles.filter((role) => oldRoles.includes(role));
    for (const role of rolesToUpdate) {
      const roleTableName = getRoleTableName(role);
      const privilege = newPrivileges[role];

      const updateQuery = `
        UPDATE \`${this.datasetId}.${roleTableName}\`
        SET privilege = @privilege
        WHERE userId = @userId
      `;
      await this.bigquery.query({
        query: updateQuery,
        params: { userId, privilege },
      });
    }

    // Update roles array in users table
    const updateRolesQuery = `
      UPDATE \`${this.datasetId}.users\`
      SET roles = @roles
      WHERE userId = @userId
    `;
    await this.bigquery.query({
      query: updateRolesQuery,
      params: { userId, roles: newRoles },
    });
  }

  async deleteUser(userId: string): Promise<void> {
    // Get user to find all their roles
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete from all role-specific tables
    for (const role of user.roles) {
      const roleTableName = getRoleTableName(role);
      const deleteQuery = `
        DELETE FROM \`${this.datasetId}.${roleTableName}\`
        WHERE userId = @userId
      `;
      await this.bigquery.query({ query: deleteQuery, params: { userId } });
    }

    // Delete from users table
    const deleteUserQuery = `
      DELETE FROM \`${this.datasetId}.users\`
      WHERE userId = @userId
    `;
    await this.bigquery.query({
      query: deleteUserQuery,
      params: { userId },
    });
  }

  async getUserByEmailExcludingUserId(
    email: string,
    excludeUserId: string,
  ): Promise<User | null> {
    const query = `
      SELECT * FROM \`${this.datasetId}.users\`
      WHERE email = @email AND userId != @excludeUserId
      LIMIT 1
    `;

    const options = {
      query,
      params: { email, excludeUserId },
    };

    const [rows] = await this.bigquery.query(options);
    return rows.length > 0 ? (rows[0] as User) : null;
  }
}
