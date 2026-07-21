import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';

@ApiTags('Classes')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Class already exists' })
  async create(@Body() dto: CreateClassDto, @Request() req: AuthenticatedRequest) {
    return this.classesService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all classes' })
  @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('level') level?: number,
  ) {
    return this.classesService.findAll(req.user, page, limit, level);
  }

  @Get('level/:level')
  @ApiOperation({ summary: 'Get classes by level' })
  @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
  async getClassesByLevel(@Param('level') level: number, @Request() req: AuthenticatedRequest) {
    return this.classesService.getClassesByLevel(level, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class by ID' })
  @ApiResponse({ status: 200, description: 'Class retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.classesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Put(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Update class' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.classesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
  @ApiOperation({ summary: 'Delete class (soft delete)' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.classesService.remove(id, req.user);
  }

  // ── Subject assignment routes ──────────────────────────────────────────────

  @Get(':id/subjects')
  @ApiOperation({ summary: 'Get subjects assigned to a class' })
  @ApiResponse({ status: 200, description: 'Class subjects retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async getClassSubjects(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.classesService.getClassSubjects(id, req.user);
  }

  @Post(':id/subjects')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign subjects to a class' })
  @ApiResponse({ status: 200, description: 'Subjects assigned successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async assignSubjects(
    @Param('id') id: string,
    @Body() body: { subjectIds: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.classesService.assignSubjects(id, body.subjectIds, req.user);
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
  @ApiOperation({ summary: 'Remove a subject from a class' })
  @ApiResponse({ status: 200, description: 'Subject removed successfully' })
  @ApiResponse({ status: 404, description: 'Class or assignment not found' })
  async removeSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.classesService.removeSubject(id, subjectId, req.user);
  }
}
