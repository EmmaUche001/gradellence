import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';
import { Cache } from '../../common/decorators/cache.decorator';

@ApiTags('Students')
@Controller('v1/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateStudentDto, @Request() req: AuthenticatedRequest) {
    return this.studentsService.create(dto, req.user);
  }

  @Get()
  @Cache({ ttl: 60 })
  @ApiOperation({ summary: 'Get all students' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.studentsService.findAll(req.user, page, limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.studentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update student' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.studentsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete student (soft delete)' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.studentsService.remove(id, req.user);
  }

  @Get(':id/enrollments')
  @ApiOperation({ summary: 'Get student enrollments' })
  @ApiResponse({ status: 200, description: 'Student enrollments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentEnrollments(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.studentsService.getStudentEnrollments(id, req.user);
  }
}