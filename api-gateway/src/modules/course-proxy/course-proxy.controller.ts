import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import { CourseProxyService } from './course-proxy.service';

@Controller('api/courses')
export class CourseProxyController {
  constructor(private readonly courseProxyService: CourseProxyService) {}

  @Get()
  async findAll(@Query() query: any, @Headers() headers: any) {
    return this.courseProxyService.proxyRequest('GET', '', { query, headers });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query() query: any,
    @Headers() headers: any,
  ) {
    return this.courseProxyService.proxyRequest('GET', `/${id}`, {
      query,
      headers,
    });
  }

  @Post()
  async create(@Body() body: any, @Headers() headers: any) {
    return this.courseProxyService.proxyRequest('POST', '', { body, headers });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.courseProxyService.proxyRequest('PUT', `/${id}`, {
      body,
      headers,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Headers() headers: any) {
    return this.courseProxyService.proxyRequest('DELETE', `/${id}`, {
      headers,
    });
  }
}
