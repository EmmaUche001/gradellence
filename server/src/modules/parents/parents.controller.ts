import { Controller, Post, Get, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { ParentRegisterDto } from './dto/parent-register.dto';
import { ParentLoginDto } from './dto/parent-login.dto';
import { JwtParentAuthGuard } from '../../common/guards/jwt-parent-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Parents')
@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as a parent' })
  register(@Body() dto: ParentRegisterDto) {
    return this.parentsService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parent login' })
  login(@Body() dto: ParentLoginDto) {
    return this.parentsService.login(dto);
  }

  @Get('students')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked students' })
  getStudents(@CurrentUser() user: any) {
    return this.parentsService.getStudents(user.id);
  }

  @Get('students/:studentId/results')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student results' })
  getStudentResults(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.parentsService.getStudentResults(user.id, studentId);
  }

  @Get('students/:studentId/analytics')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student analytics' })
  getStudentAnalytics(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.parentsService.getStudentAnalytics(user.id, studentId);
  }
}