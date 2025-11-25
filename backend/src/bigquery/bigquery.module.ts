import { Module } from '@nestjs/common';
import { BigQueryService } from './bigquery.service';
import { TableValidatorService } from './validators/table-validator.service';
import { AutoMigratorService } from './migrations/auto-migrator.service';

@Module({
  providers: [BigQueryService, TableValidatorService, AutoMigratorService],
  exports: [BigQueryService, TableValidatorService, AutoMigratorService],
})
export class BigQueryModule {}
