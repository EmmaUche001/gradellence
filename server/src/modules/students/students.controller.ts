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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PromoteStudentsDto } from './dto/promote-students.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';
import { Cache } from '../../common/decorators/cache.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';
import { ExportService } from '../../common/export/export.service';

@ApiTags('Students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
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
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
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
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
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

  @Post('promote')
  @Roles(ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Promote students from one class/term to another' })
  @ApiResponse({ status: 200, description: 'Students promoted successfully' })
  @ApiResponse({ status: 404, description: 'Class or term not found' })
  async promote(@Body() dto: PromoteStudentsDto, @Request() req: AuthenticatedRequest) {
    return this.studentsService.promoteStudents(dto, req.user);
  }

  @Post('import')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import students from CSV' })
  @ApiResponse({ status: 200, description: 'Import result' })
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  async importStudents(@Request() req: AuthenticatedRequest, @Body() file: any) {
    const csvContent = file?.csv || '';
    return this.studentsService.importCsv(req.user.schoolId, csvContent);
  }

  @Get('export')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.READ)
  @ApiOperation({ summary: 'Export students to CSV' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'termId', required: false })
  async exportStudents(
    @Request() req: AuthenticatedRequest,
    @Query('classId') classId?: string,
    @Query('termId') termId?: string,
  ) {
    const data = await this.studentsService.export(req.user.schoolId, classId, termId);
    return this.exportService.toCsvStream(data, 'students');
  }
}
