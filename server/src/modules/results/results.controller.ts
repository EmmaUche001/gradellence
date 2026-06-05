import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { PublishResultDto } from './dto/publish-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';

@ApiTags('Results')
@ApiBearerAuth()
@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post('compute/:classId/:termId')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Compute results for a class in a term' })
  compute(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @Body('subjectIds') subjectIds: string[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resultsService.computeResults(classId, termId, user, subjectIds);
  }

  @Post('publish')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Publish results for a class and term' })
  publish(@Body() dto: PublishResultDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.publishResults(dto, user);
  }

  @Post('unpublish')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Unpublish results for a class and term' })
  unpublish(@Body() dto: PublishResultDto, @CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.unpublishResults(dto, user);
  }

  @Get()
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get all results with pagination and filters' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('studentId') studentId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('termId') termId?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const publishedBool = isPublished !== undefined ? isPublished === 'true' : undefined;
    return this.resultsService.findAll(user, page, limit, studentId, subjectId, termId, publishedBool);
  }

  @Get(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get result by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.findOne(id, user);
  }

  @Get('student/:studentId/:termId')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get results for a specific student in a term' })
  getStudentResults(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resultsService.getStudentResults(studentId, termId, user);
  }

  @Get('class/:classId/:termId')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get results for a class in a term' })
  getClassResults(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resultsService.getClassResults(classId, termId, user);
  }

  @Get('broadsheet/:classId/:termId')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Generate broadsheet for a class in a term' })
  getBroadsheet(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resultsService.getBroadsheet(classId, termId, user);
  }
}