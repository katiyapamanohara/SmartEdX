import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Headers,
} from '@nestjs/common';
import { UserProxyService } from './user-proxy.service';
import { Request } from 'express';

@Controller('api/users')
export class UserProxyController {
  constructor(private readonly userProxyService: UserProxyService) {}

  @Get()
  async findAll(@Query() query: any, @Headers() headers: any) {
    return this.userProxyService.proxyRequest('GET', '', { query, headers });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query() query: any,
    @Headers() headers: any,
  ) {
    return this.userProxyService.proxyRequest('GET', `/${id}`, {
      query,
      headers,
    });
  }

  @Post()
  async create(@Body() body: any, @Headers() headers: any) {
    return this.userProxyService.proxyRequest('POST', '', { body, headers });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.userProxyService.proxyRequest('PUT', `/${id}`, {
      body,
      headers,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Headers() headers: any) {
    return this.userProxyService.proxyRequest('DELETE', `/${id}`, { headers });
  }
}
