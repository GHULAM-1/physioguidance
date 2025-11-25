import { Injectable, Logger } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { RoleTableGenerator } from '../schemas/role-table.generator';

export interface ValidationResult {
  allTablesExist: boolean;
  missingTables: string[];
  existingTables: string[];
  usersTableExists: boolean;
}

/**
 * TableValidatorService - Validates that all required tables exist
 *
 * Checks if all tables corresponding to Role ENUM values exist in BigQuery.
 * This ensures the database structure matches the application's ENUM definitions.
 */
@Injectable()
export class TableValidatorService {
  private readonly logger = new Logger(TableValidatorService.name);
  private readonly bigquery: BigQuery;
  private readonly datasetId: string;

  constructor() {
    this.bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID || 'test-project',
      apiEndpoint:
        process.env.BIGQUERY_EMULATOR_HOST || 'http://localhost:9050',
    });
    this.datasetId = process.env.BIGQUERY_DATASET_ID || 'test_dataset';
  }

  /**
   * Validates that all tables required by the Role ENUM exist
   * Returns detailed information about which tables exist and which are missing
   */
  async validateAllTablesExist(): Promise<ValidationResult> {
    const expectedTables = RoleTableGenerator.getExpectedTableNames();
    const missingTables: string[] = [];
    const existingTables: string[] = [];

    this.logger.log(`Validating ${expectedTables.length} role tables...`);

    // Check each role table
    for (const tableName of expectedTables) {
      const exists = await this.checkTableExists(tableName);
      if (exists) {
        existingTables.push(tableName);
        this.logger.log(`✓ Table '${tableName}' exists`);
      } else {
        missingTables.push(tableName);
        this.logger.warn(`✗ Table '${tableName}' missing`);
      }
    }

    // Check the users table
    const usersTableExists = await this.checkTableExists('users');
    if (usersTableExists) {
      this.logger.log(`✓ Table 'users' exists`);
    } else {
      this.logger.warn(`✗ Table 'users' missing`);
    }

    const allTablesExist = missingTables.length === 0 && usersTableExists;

    if (allTablesExist) {
      this.logger.log('✅ All required tables exist');
    } else {
      this.logger.error(
        `❌ Missing ${missingTables.length + (usersTableExists ? 0 : 1)} table(s)`,
      );
    }

    return {
      allTablesExist,
      missingTables,
      existingTables,
      usersTableExists,
    };
  }

  /**
   * Checks if a specific table exists in BigQuery
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const dataset = this.bigquery.dataset(this.datasetId);
      const table = dataset.table(tableName);
      const [exists] = await table.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Error checking table ${tableName}:`, error.message);
      return false;
    }
  }
}
