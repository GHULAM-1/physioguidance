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

    await this.bigquery
      .dataset(this.datasetId)
      .table('users')
      .insert([user]);

    // Insert into each role-specific table with privileges
    for (const role of userData.roles) {
      const roleTableName = getRoleTableName(role);
      const privilege = userData.privileges[role];

      await this.bigquery
        .dataset(this.datasetId)
        .table(roleTableName)
        .insert([
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
}
