import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BigQueryModule } from '../bigquery/bigquery.module';
import { RolesGuard } from './guards/roles.guard';
import { PrivilegeGuard } from './guards/privilege.guard';
import { AuthGuard } from './guards/auth.guard';
import { JwtAuthMiddleware } from './middleware/jwt-auth.middleware';

@Module({
  imports: [BigQueryModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, PrivilegeGuard, JwtAuthMiddleware],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
