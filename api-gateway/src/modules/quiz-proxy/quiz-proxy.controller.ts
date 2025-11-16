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
import { QuizProxyService } from './quiz-proxy.service';

@Controller('api/quizzes')
export class QuizProxyController {
  constructor(private readonly quizProxyService: QuizProxyService) {}

  @Get()
  async findAll(@Query() query: any, @Headers() headers: any) {
    return this.quizProxyService.proxyRequest('GET', '', { query, headers });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query() query: any,
    @Headers() headers: any,
  ) {
    return this.quizProxyService.proxyRequest('GET', `/${id}`, {
      query,
      headers,
    });
  }

  @Post()
  async create(@Body() body: any, @Headers() headers: any) {
    return this.quizProxyService.proxyRequest('POST', '', { body, headers });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.quizProxyService.proxyRequest('PUT', `/${id}`, {
      body,
      headers,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Headers() headers: any) {
    return this.quizProxyService.proxyRequest('DELETE', `/${id}`, { headers });
  }
}
