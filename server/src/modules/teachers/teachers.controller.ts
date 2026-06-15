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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new teacher' })
  @ApiResponse({ status: 201, description: 'Teacher created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateTeacherDto, @Request() req: AuthenticatedRequest) {
    return this.teachersService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teachers' })
  @ApiResponse({ status: 200, description: 'Teachers retrieved successfully' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.teachersService.findAll(req.user, page, limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get teacher by ID' })
  @ApiResponse({ status: 200, description: 'Teacher retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.teachersService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update teacher' })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teachersService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete teacher (soft delete)' })
  @ApiResponse({ status: 200, description: 'Teacher deleted successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.teachersService.remove(id, req.user);
  }

  // Teacher-Subject Assignment
  @Post('assign')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Assign teacher to subject and class' })
  @ApiResponse({ status: 201, description: 'Teacher assigned successfully' })
  @ApiResponse({ status: 404, description: 'Teacher, subject, or class not found' })
  @ApiResponse({ status: 409, description: 'Teacher already assigned' })
  async assignToSubject(@Body() dto: AssignTeacherDto, @Request() req: AuthenticatedRequest) {
    return this.teachersService.assignToSubject(dto, req.user);
  }

  @Delete(':teacherId/subjects/:subjectId/classes/:classId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Remove teacher from subject and class' })
  @ApiResponse({ status: 200, description: 'Teacher removed successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeFromSubject(
    @Param('teacherId') teacherId: string,
    @Param('subjectId') subjectId: string,
    @Param('classId') classId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teachersService.removeFromSubject(teacherId, subjectId, classId, req.user);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get teacher assignments' })
  @ApiResponse({ status: 200, description: 'Teacher assignments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getTeacherAssignments(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.teachersService.getTeacherAssignments(id, req.user);
  }
}