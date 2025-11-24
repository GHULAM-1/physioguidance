import { Controller, Get, Param } from '@nestjs/common';
import { AppService, Clas } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

@Controller('as')
export class AppTwo {
  constructor(private readonly classa: Clas) {}

  @Get(':id')
  getHel(@Param('id') id: string): string {
    return this.classa.getHelL(id);
  }
}
