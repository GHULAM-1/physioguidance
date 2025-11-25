import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AppController, AppTwo } from './app.controller';
import { AppService, Clas } from './app.service';
import { BigQueryModule } from './bigquery/bigquery.module';
import { AuthModule } from './auth/auth.module';
import { TableValidatorService } from './bigquery/validators/table-validator.service';
import { AutoMigratorService } from './bigquery/migrations/auto-migrator.service';

@Module({
  imports: [BigQueryModule, AuthModule],
  controllers: [AppController, AppTwo],
  providers: [AppService, Clas],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly validator: TableValidatorService,
    private readonly migrator: AutoMigratorService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing application...');

    // Check AUTO_MIGRATE environment variable
    const autoMigrate = process.env.AUTO_MIGRATE === 'true';

    if (autoMigrate) {
      this.logger.log('🔄 AUTO_MIGRATE enabled - will create missing tables');

      try {
        // Ensure dataset exists first
        await this.migrator.ensureDatasetExists();

        // Auto-create missing tables
        const result = await this.migrator.autoCreateMissingTables();

        if (result.created.length > 0) {
          this.logger.log(`✅ Created ${result.created.length} table(s): ${result.created.join(', ')}`);
        }

        if (result.failed.length > 0) {
          this.logger.error(`❌ Failed to create ${result.failed.length} table(s)`);
          result.failed.forEach(({ table, error }) => {
            this.logger.error(`  - ${table}: ${error}`);
          });
        }
      } catch (error) {
        this.logger.error('❌ Auto-migration failed:', error.message);
        throw new Error(`Database initialization failed: ${error.message}`);
      }
    } else {
      this.logger.log('🔍 AUTO_MIGRATE disabled - validating tables exist');

      // Just validate, don't create
      const validation = await this.validator.validateAllTablesExist();

      if (!validation.allTablesExist) {
        const missing = [...validation.missingTables];
        if (!validation.usersTableExists) {
          missing.push('users');
        }

        this.logger.error(`❌ Missing tables: ${missing.join(', ')}`);
        this.logger.error('💡 Fix: Run "npm run init:bigquery" or set AUTO_MIGRATE=true');

        throw new Error(
          `Database tables missing: ${missing.join(', ')}. ` +
          `Run "npm run init:bigquery" to create them or set AUTO_MIGRATE=true to auto-create.`,
        );
      }

      this.logger.log('✅ All required tables exist');
    }

    this.logger.log('✅ Application initialized successfully');
  }
}
