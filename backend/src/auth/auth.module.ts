import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BigQueryModule } from '../bigquery/bigquery.module';
import { RolesGuard } from './guards/roles.guard';
import { PrivilegeGuard } from './guards/privilege.guard';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [BigQueryModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, PrivilegeGuard],
  exports: [AuthService],
})
export class AuthModule {}
