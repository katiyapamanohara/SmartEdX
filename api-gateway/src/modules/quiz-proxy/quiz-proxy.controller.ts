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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QuizProxyService } from './quiz-proxy.service';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '../../core/enums/role.enum';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Quizzes')
@ApiBearerAuth('JWT-auth')
@Controller('api/quizzes')
export class QuizProxyController {
  constructor(private readonly quizProxyService: QuizProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quizzes (Authenticated users)' })
  @ApiResponse({ status: 200, description: 'Returns list of all quizzes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: any, @Headers() headers: any, @CurrentUser() user: any) {
    return this.quizProxyService.proxyRequest('GET', '', { query, headers, user });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID (Authenticated users)' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Returns quiz details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async findOne(
    @Param('id') id: string,
    @Query() query: any,
    @Headers() headers: any,
    @CurrentUser() user: any,
  ) {
    return this.quizProxyService.proxyRequest('GET', `/${id}`, {
      query,
      headers,
      user,
    });
  }

  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Post()
  @ApiOperation({ summary: 'Create quiz (Admin/Instructor only)' })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Instructor role required',
  })
  async create(@Body() body: any, @Headers() headers: any, @CurrentUser() user: any) {
    return this.quizProxyService.proxyRequest('POST', '', { body, headers, user });
  }

  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Put(':id')
  @ApiOperation({ summary: 'Update quiz (Admin/Instructor only)' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Instructor role required',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Headers() headers: any,
    @CurrentUser() user: any,
  ) {
    return this.quizProxyService.proxyRequest('PUT', `/${id}`, {
      body,
      headers,
      user,
    });
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete quiz (Admin only)' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async remove(@Param('id') id: string, @Headers() headers: any, @CurrentUser() user: any) {
    return this.quizProxyService.proxyRequest('DELETE', `/${id}`, { headers, user });
  }
}
