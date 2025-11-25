import { Module } from '@nestjs/common';
import { AppController, AppTwo } from './app.controller';
import { AppService, Clas } from './app.service';
import { BigQueryModule } from './bigquery/bigquery.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [BigQueryModule, AuthModule],
  controllers: [AppController, AppTwo],
  providers: [AppService, Clas],
})
export class AppModule {}
