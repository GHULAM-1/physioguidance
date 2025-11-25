import { Injectable, Logger } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { TableValidatorService } from '../validators/table-validator.service';
import { RoleTableGenerator } from '../schemas/role-table.generator';
import { MigrationResult } from '../../types/bigquery/type';

/**
 * AutoMigratorService - Automatically creates missing tables
 *
 * Reads the Role ENUM and creates any missing department tables with the standard schema.
 * This enables a fully automated workflow: add role to ENUM → table auto-creates.
 */
@Injectable()
export class AutoMigratorService {
  private readonly logger = new Logger(AutoMigratorService.name);
  private readonly bigquery: BigQuery;
  private readonly datasetId: string;

  constructor(private readonly validator: TableValidatorService) {
    this.bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID || 'test-project',
      apiEndpoint:
        process.env.BIGQUERY_EMULATOR_HOST || 'http://localhost:9050',
    });
    this.datasetId = process.env.BIGQUERY_DATASET_ID || 'test_dataset';
  }

  /**
   * Automatically creates missing tables based on Role ENUM
   * Returns list of created tables and any failures
   */
  async autoCreateMissingTables(): Promise<MigrationResult> {
    this.logger.log('🔄 Starting auto-migration...');

    const validation = await this.validator.validateAllTablesExist();

    if (validation.allTablesExist) {
      this.logger.log('✅ All tables exist, no migration needed');
      return { created: [], failed: [] };
    }

    const created: string[] = [];
    const failed: Array<{ table: string; error: string }> = [];

    // Create users table if missing
    if (!validation.usersTableExists) {
      try {
        await this.createUsersTable();
        created.push('users');
        this.logger.log('✅ Created table: users');
      } catch (error) {
        failed.push({ table: 'users', error: error.message });
        this.logger.error('❌ Failed to create table users:', error.message);
      }
    }

    // Create missing role tables
    for (const tableName of validation.missingTables) {
      try {
        await this.createRoleTable(tableName);
        created.push(tableName);
        this.logger.log(`✅ Created table: ${tableName}`);
      } catch (error) {
        failed.push({ table: tableName, error: error.message });
        this.logger.error(
          `❌ Failed to create table ${tableName}:`,
          error.message,
        );
      }
    }

    if (created.length > 0) {
      this.logger.log(
        `✅ Auto-migration complete: Created ${created.length} table(s)`,
      );
    }

    if (failed.length > 0) {
      this.logger.error(`❌ Auto-migration had ${failed.length} failure(s)`);
    }

    return { created, failed };
  }

  /**
   * Creates a single role/department table with the standard schema
   */
  private async createRoleTable(tableName: string): Promise<void> {
    const schema = RoleTableGenerator.getRoleTableSchema();
    const dataset = this.bigquery.dataset(this.datasetId);

    await dataset.createTable(tableName, { schema });
  }

  /**
   * Creates the users table (common data for all users)
   */
  private async createUsersTable(): Promise<void> {
    const schema = RoleTableGenerator.getUsersTableSchema();
    const dataset = this.bigquery.dataset(this.datasetId);

    await dataset.createTable('users', { schema });
  }

  /**
   * Creates the dataset if it doesn't exist
   * Useful for completely fresh environments
   */
  async ensureDatasetExists(): Promise<void> {
    try {
      const dataset = this.bigquery.dataset(this.datasetId);
      const [exists] = await dataset.exists();

      if (!exists) {
        await this.bigquery.createDataset(this.datasetId);
        this.logger.log(`✅ Created dataset: ${this.datasetId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create dataset ${this.datasetId}:`,
        error.message,
      );
      throw error;
    }
  }
}
