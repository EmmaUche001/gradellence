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
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';

@ApiTags('Subjects')
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({ status: 201, description: 'Subject created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Subject code already exists' })
  async create(@Body() dto: CreateSubjectDto, @Request() req: AuthenticatedRequest) {
    return this.subjectsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subjects' })
  @ApiResponse({ status: 200, description: 'Subjects retrieved successfully' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.subjectsService.findAll(req.user, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  @ApiResponse({ status: 200, description: 'Subject retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.subjectsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update subject' })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.subjectsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete subject (soft delete)' })
  @ApiResponse({ status: 200, description: 'Subject deleted successfully' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.subjectsService.remove(id, req.user);
  }

  // Subject-Class Assignment
  @Post('assign')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Assign subject to class' })
  @ApiResponse({ status: 201, description: 'Subject assigned successfully' })
  @ApiResponse({ status: 404, description: 'Subject or class not found' })
  @ApiResponse({ status: 409, description: 'Subject already assigned to class' })
  async assignToClass(@Body() dto: AssignSubjectDto, @Request() req: AuthenticatedRequest) {
    return this.subjectsService.assignToClass(dto, req.user);
  }

  @Delete(':subjectId/classes/:classId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Remove subject from class' })
  @ApiResponse({ status: 200, description: 'Subject removed successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeFromClass(
    @Param('subjectId') subjectId: string,
    @Param('classId') classId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.subjectsService.removeFromClass(subjectId, classId, req.user);
  }

  @Get('classes/:classId')
  @ApiOperation({ summary: 'Get subjects for a class' })
  @ApiResponse({ status: 200, description: 'Class subjects retrieved successfully' })
  async getClassSubjects(@Param('classId') classId: string, @Request() req: AuthenticatedRequest) {
    return this.subjectsService.getClassSubjects(classId, req.user);
  }
}