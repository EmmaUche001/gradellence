import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GradeScalesService } from './grade-scales.service';
import { CreateGradeScaleDto } from './dto/create-grade-scale.dto';
import { UpdateGradeScaleDto } from './dto/update-grade-scale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';

@ApiTags('Grade Scales')
@ApiBearerAuth()
@Controller('grade-scales')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class GradeScalesController {
  constructor(private readonly gradeScalesService: GradeScalesService) {}

  @Post()
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Create a new grade scale' })
  create(@Body() dto: CreateGradeScaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.gradeScalesService.create(dto, user);
  }

  @Get()
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Get all grade scales with pagination' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.gradeScalesService.findAll(user, page, limit, activeBool);
  }

  @Get(':id')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Get grade scale by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.gradeScalesService.findOne(id, user);
  }

  @Put(':id')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Update a grade scale' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGradeScaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gradeScalesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Soft delete a grade scale' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.gradeScalesService.remove(id, user);
  }

  @Patch(':id/activate')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Toggle grade scale active status' })
  toggleActive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.gradeScalesService.toggleActive(id, user);
  }
}