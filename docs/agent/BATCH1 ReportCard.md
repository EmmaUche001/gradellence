# BATCH 1: Report Card Configuration — Schema & Backend

You are implementing a multi-tenant report card 
customization system for Gradellence SRMS. Read these 
files COMPLETELY before writing any code:

1. server/prisma/schema.prisma
2. server/src/modules/auth/auth.service.ts (for patterns)
3. server/src/modules/schools/schools.service.ts (for patterns)
4. server/src/common/types/express.types.ts
5. ENGINEERING_ARCHITECTURE.md

Understand the existing patterns before proceeding.
Every school is a tenant. Every record must be scoped 
to schoolId. Follow all existing architectural patterns.

═══════════════════════════════════════════════
PART A — SCHEMA CHANGES
═══════════════════════════════════════════════

Add this model to server/prisma/schema.prisma 
AFTER the School model:

model ReportCardConfig {
  id                  String   @id @default(uuid()) @map("id")
  schoolId            String   @unique @map("school_id")
  
  // Template
  template            String   @default("classic") @map("template")
  accentColor         String   @default("#1a56db") @map("accent_color")
  
  // School Identity
  motto               String?  @map("motto")
  principalName       String?  @map("principal_name")
  principalSignature  String?  @map("principal_signature")
  schoolStamp         String?  @map("school_stamp")
  
  // Section Toggles
  showRanking         Boolean  @default(true) @map("show_ranking")
  showCumulative      Boolean  @default(true) @map("show_cumulative")
  showAffective       Boolean  @default(false) @map("show_affective")
  showPsychomotor     Boolean  @default(false) @map("show_psychomotor")
  showTeacherRemark   Boolean  @default(true) @map("show_teacher_remark")
  showPrincipalRemark Boolean  @default(true) @map("show_principal_remark")
  showResumptionDate  Boolean  @default(true) @map("show_resumption_date")
  showStamp           Boolean  @default(true) @map("show_stamp")
  showPoweredBy       Boolean  @default(true) @map("show_powered_by")
  
  // Affective Domain
  affectiveTraits     Json?    @map("affective_traits")
  // Default: ["Punctuality","Neatness","Cooperation",
  //           "Attentiveness","Politeness"]
  // Each trait graded: Excellent/Good/Fair/Poor
  
  // Psychomotor Domain  
  psychomotorTraits   Json?    @map("psychomotor_traits")
  // Default: ["Drawing","Sports","Handwriting",
  //           "Music","Computer Skills"]
  
  // Footer
  footerText          String?  @map("footer_text")
  nextTermDate        String?  @map("next_term_date")
  
  // Audit
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  
  // Relations
  school School @relation(fields: [schoolId], 
                          references: [id])
  
  @@map("report_card_configs")
}

Add back-relation to School model:
  reportCardConfig ReportCardConfig?

Run migration:
  npx prisma migrate dev --name add_report_card_config

═══════════════════════════════════════════════
PART B — DTOs
═══════════════════════════════════════════════

Create server/src/modules/report-card-config/dto/
update-report-card-config.dto.ts:

import { IsString, IsBoolean, IsOptional, 
         IsArray, IsHexColor } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReportCardConfigDto {
  @ApiPropertyOptional({ 
    enum: ['classic','modern','detailed','primary'],
    example: 'classic' 
  })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ example: '#1a56db' })
  @IsHexColor()
  @IsOptional()
  accentColor?: string;

  @ApiPropertyOptional({ example: 'Knowledge is Power' })
  @IsString()
  @IsOptional()
  motto?: string;

  @ApiPropertyOptional({ example: 'Mrs. Adaeze Okonkwo' })
  @IsString()
  @IsOptional()
  principalName?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showRanking?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showCumulative?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showAffective?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPsychomotor?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showTeacherRemark?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPrincipalRemark?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showResumptionDate?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showStamp?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPoweredBy?: boolean;

  @ApiPropertyOptional({ 
    example: ['Punctuality','Neatness','Cooperation'] 
  })
  @IsArray()
  @IsOptional()
  affectiveTraits?: string[];

  @ApiPropertyOptional({ 
    example: ['Drawing','Sports','Handwriting'] 
  })
  @IsArray()
  @IsOptional()
  psychomotorTraits?: string[];

  @ApiPropertyOptional({ 
    example: 'Results are issued without alteration.' 
  })
  @IsString()
  @IsOptional()
  footerText?: string;

  @ApiPropertyOptional({ example: '6th January 2026' })
  @IsString()
  @IsOptional()
  nextTermDate?: string;
}

═══════════════════════════════════════════════
PART C — SERVICE
═══════════════════════════════════════════════

Create server/src/modules/report-card-config/
report-card-config.service.ts:

@Injectable()
export class ReportCardConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // Get config for a school — creates default if 
  // none exists (upsert pattern)
  async getConfig(schoolId: string) {
    let config = await this.prisma.reportCardConfig
      .findUnique({ where: { schoolId } });
    
    if (!config) {
      config = await this.prisma.reportCardConfig.create({
        data: {
          schoolId,
          affectiveTraits: [
            'Punctuality', 'Neatness', 'Cooperation',
            'Attentiveness', 'Politeness'
          ],
          psychomotorTraits: [
            'Drawing', 'Sports', 'Handwriting',
            'Music', 'Computer Skills'
          ],
        },
      });
    }
    
    return {
      success: true,
      message: 'Report card config retrieved',
      data: config,
    };
  }

  // Update config — upsert so it always works
  async updateConfig(
    schoolId: string,
    dto: UpdateReportCardConfigDto,
  ) {
    const config = await this.prisma.reportCardConfig.upsert({
      where: { schoolId },
      update: { ...dto },
      create: {
        schoolId,
        ...dto,
        affectiveTraits: dto.affectiveTraits ?? [
          'Punctuality', 'Neatness', 'Cooperation',
          'Attentiveness', 'Politeness'
        ],
        psychomotorTraits: dto.psychomotorTraits ?? [
          'Drawing', 'Sports', 'Handwriting',
          'Music', 'Computer Skills'
        ],
      },
    });
    
    return {
      success: true,
      message: 'Report card config updated',
      data: config,
    };
  }

  // Upload image — stores file path, returns URL
  // Used for logo, principal signature, school stamp
  async uploadImage(
    schoolId: string,
    field: 'principalSignature' | 'schoolStamp',
    fileUrl: string,
  ) {
    const config = await this.prisma.reportCardConfig.upsert({
      where: { schoolId },
      update: { [field]: fileUrl },
      create: {
        schoolId,
        [field]: fileUrl,
      },
    });
    
    return {
      success: true,
      message: 'Image uploaded successfully',
      data: { field, url: fileUrl },
    };
  }
}

═══════════════════════════════════════════════
PART D — CONTROLLER
═══════════════════════════════════════════════

Create server/src/modules/report-card-config/
report-card-config.controller.ts:

@ApiTags('Report Card Config')
@Controller('report-card-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportCardConfigController {
  constructor(
    private readonly service: ReportCardConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get school report card config' })
  async getConfig(@Request() req: AuthenticatedRequest) {
    return this.service.getConfig(req.user.schoolId);
  }

  @Patch()
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update report card config' })
  async updateConfig(
    @Body() dto: UpdateReportCardConfigDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateConfig(req.user.schoolId, dto);
  }

  @Post('upload/:field')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload signature or stamp image' 
  })
  @ApiConsumes('multipart/form-data')
  async uploadImage(
    @Param('field') field: 'principalSignature' | 'schoolStamp',
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    // Validate field name
    if (!['principalSignature','schoolStamp']
      .includes(field)) {
      throw new BadRequestException('Invalid field name');
    }
    
    // Validate file type
    const allowedMimes = ['image/jpeg','image/png',
                          'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG and WebP images are allowed'
      );
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException(
        'File size must not exceed 2MB'
      );
    }
    
    // Store file locally for now
    // TODO: swap to S3 when STORAGE_PROVIDER=s3
    const fileName = 
      `${req.user.schoolId}-${field}-${Date.now()}` +
      `.${file.mimetype.split('/')[1]}`;
    const uploadPath = 
      `./uploads/report-cards/${fileName}`;
    
    const fs = require('fs');
    const path = require('path');
    fs.mkdirSync(
      path.dirname(uploadPath), 
      { recursive: true }
    );
    fs.writeFileSync(uploadPath, file.buffer);
    
    const fileUrl = `/uploads/report-cards/${fileName}`;
    
    return this.service.uploadImage(
      req.user.schoolId, field, fileUrl
    );
  }
}

═══════════════════════════════════════════════
PART E — MODULE AND REGISTRATION
═══════════════════════════════════════════════

Create server/src/modules/report-card-config/
report-card-config.module.ts:

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  ],
  controllers: [ReportCardConfigController],
  providers: [ReportCardConfigService],
  exports: [ReportCardConfigService],
})
export class ReportCardConfigModule {}

Import ReportCardConfigModule in app.module.ts.

Also serve the uploads folder as static files in 
main.ts:
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

Install @nestjs/serve-static if not already in 
package.json, OR use the built-in NestJS static 
assets approach with ServeStaticModule.

═══════════════════════════════════════════════
PART F — ALSO: Update School logo upload
═══════════════════════════════════════════════

The School model already has a logo field. 
In schools.controller.ts, add a logo upload endpoint 
following the same pattern as above:

  POST /api/v1/schools/upload-logo
  - File upload (same validation: JPEG/PNG/WebP, 2MB max)
  - Updates school.logo field with the file URL
  - Only SCHOOL_ADMIN or SUPER_ADMIN can call this

═══════════════════════════════════════════════
VERIFICATION
═══════════════════════════════════════════════

After completing all parts:

1. Run: cd server && npm run build
   Must complete with zero TypeScript errors.

2. Verify migration ran: 
   npx prisma migrate status
   Must show "up to date"

3. Confirm these endpoints exist and are registered:
   GET    /api/v1/report-card-config
   PATCH  /api/v1/report-card-config
   POST   /api/v1/report-card-config/upload/principalSignature
   POST   /api/v1/report-card-config/upload/schoolStamp
   POST   /api/v1/schools/upload-logo

4. Report all files created or modified.



