import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';
import { ROLES } from '../../common/constants/roles.constants';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Post()
  @Roles(ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a new announcement' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)
  @ApiOperation({ summary: 'List all announcements for this school' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.service.findAll(user, page, limit);
  }

  @Get(':id')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get a single announcement by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update an announcement' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete an announcement' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}
