import { Module } from '@nestjs/common';
import { AppController, AppTwo } from './app.controller';
import { AppService, Clas } from './app.service';

@Module({
  imports: [],
  controllers: [AppController, AppTwo],
  providers: [AppService, Clas],
})
export class AppModule {}
