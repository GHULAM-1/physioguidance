import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

@Injectable()
export class Clas {
  getHelL(id: string): string {
    return `efrefej${id}`;
  }
}
