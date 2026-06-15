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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';

@ApiTags('Sessions & Terms')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // ==================== SESSIONS ====================

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new academic session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createSession(@Body() dto: CreateSessionDto, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.createSession(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async findAllSessions(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.sessionsService.findAllSessions(req.user, page, limit);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current session' })
  @ApiResponse({ status: 200, description: 'Current session retrieved successfully' })
  async getCurrentSession(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getCurrentSession(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOneSession(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.findOneSession(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.updateSession(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete session (soft delete)' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async removeSession(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.removeSession(id, req.user);
  }

  // ==================== TERMS ====================

  @Post(':sessionId/terms')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new term' })
  @ApiResponse({ status: 201, description: 'Term created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async createTerm(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateTermDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.createTerm({ ...dto, sessionId }, req.user);
  }

  @Get(':sessionId/terms')
  @ApiOperation({ summary: 'Get all terms for a session' })
  @ApiResponse({ status: 200, description: 'Terms retrieved successfully' })
  async findAllTerms(@Param('sessionId') sessionId: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.findAllTerms(sessionId, req.user);
  }

  @Get('terms/current')
  @ApiOperation({ summary: 'Get current term' })
  @ApiResponse({ status: 200, description: 'Current term retrieved successfully' })
  async getCurrentTerm(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.getCurrentTerm(req.user);
  }

  @Get('terms/:id')
  @ApiOperation({ summary: 'Get term by ID' })
  @ApiResponse({ status: 200, description: 'Term retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Term not found' })
  async findOneTerm(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.findOneTerm(id, req.user);
  }

  @Patch('terms/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update term' })
  @ApiResponse({ status: 200, description: 'Term updated successfully' })
  @ApiResponse({ status: 404, description: 'Term not found' })
  async updateTerm(
    @Param('id') id: string,
    @Body() dto: UpdateTermDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.updateTerm(id, dto, req.user);
  }

  @Delete('terms/:id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete term (soft delete)' })
  @ApiResponse({ status: 200, description: 'Term deleted successfully' })
  @ApiResponse({ status: 404, description: 'Term not found' })
  async removeTerm(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.sessionsService.removeTerm(id, req.user);
  }
}