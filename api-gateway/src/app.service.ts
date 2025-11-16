import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return `Api Gateway is running ${new Date().toISOString()} ${process.env.PORT}`;
  }
}
