import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { HomeService } from './home.service';

@ApiTags('Home')
@Controller()
export class HomeController {
  constructor(private service: HomeService) {}

  @Get()
  appInfo() {
    return { message: `API Gateway is running on port ${process.env.APP_PORT}` };
  }

}
