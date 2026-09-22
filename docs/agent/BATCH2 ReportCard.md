# BATCH 2: Report Card PDF Generation Engine
CRITICAL: Before implementing anything in this batch,
read these files completely:

1. server/src/common/pdf/pdf.service.ts
2. server/src/common/pdf/pdf.module.ts

For each part below (B through G), check if it is 
already implemented in the existing pdf.service.ts:

- If FULLY implemented → skip it, note it as done
- If PARTIALLY implemented → extend only the missing 
  parts, do not rewrite what works
- If NOT implemented → implement it fresh following 
  existing patterns in the file

Do not duplicate any existing method.
Do not change any working implementation.
Only ADD what is genuinely missing.

Read these files COMPLETELY before writing any code:

1. server/src/modules/report-card-config/
   report-card-config.service.ts (from Batch 1)
2. server/src/modules/results/results.service.ts
3. server/src/modules/students/students.service.ts
4. server/prisma/schema.prisma
5. server/package.json (check what PDF lib is available)

If pdfkit is in package.json, use it.
If neither pdfkit nor puppeteer is present, 
use pdfkit (install it).
Do NOT use puppeteer — it has binary dependencies 
that cause Docker issues.

═══════════════════════════════════════════════
PART A — PDF SERVICE
═══════════════════════════════════════════════

Create server/src/modules/pdf/pdf.service.ts:

This service generates a complete report card PDF 
for one student for one term.

The service must:

1. Accept these parameters:
   - studentId: string
   - termId: string  
   - schoolId: string (for tenant validation)

2. Fetch all required data:
   a. Student details (name, admission number, 
      date of birth, gender)
   b. Current enrollment → class name
   c. Term details (name, session name)
   d. School details (name, address, logo, motto, phone)
   e. ReportCardConfig for this school
   f. Published results for this student + term:
      - subject name
      - assessment breakdown (CA1, CA2, etc. scores)
      - total score
      - grade
      - remark
   g. Class size (for position calculation)
   h. Student's position in class (rank by totalScore)
   i. Student's overall average for this term
   j. Affective domain ratings if showAffective is true
      (fetch from a StudentAffective table if it exists,
      otherwise generate empty slots for manual fill)
   k. Next term resumption date from config

3. Validate tenant: schoolId must match student's 
   schoolId. Throw ForbiddenException if mismatch.

4. Check results are published (isPublished: true).
   Throw BadRequestException if not published.

5. Generate PDF based on config.template value:
   - 'classic' → classicTemplate()
   - 'modern' → modernTemplate()
   - 'detailed' → detailedTemplate()
   - 'primary' → primaryTemplate()

6. Return the PDF as a Buffer.

═══════════════════════════════════════════════
PART B — CLASSIC TEMPLATE
═══════════════════════════════════════════════

Implement classicTemplate(doc, data, config) where:
- doc is a PDFDocument instance
- data is the assembled student/results data
- config is the ReportCardConfig

Layout (A4 portrait):

--- HEADER SECTION ---
[School Logo - left, 80x80px]
[School Name - center, large bold]
[School Address - center, small]
[School Motto - center, italic]
["STUDENT REPORT CARD" - center, bold underlined]
[Horizontal divider line in accentColor]

--- STUDENT INFO SECTION ---
Two-column grid:
Left column:                Right column:
Student Name: ___           Admission No: ___
Class: ___                  Term: ___
Date of Birth: ___          Session: ___
Gender: ___                 Position: ___ of ___

[Horizontal divider]

--- RESULTS TABLE ---
Headers (bold, background in accentColor, white text):
| Subject | CA1 | CA2 | Exam | Total | Grade | Remark |

Show actual assessment type labels from 
AssessmentConfig (CA1 label, CA2 label, etc.)
Show max score in header: "CA1/20", "Exam/60"

One row per subject (alternating white/#f9fafb rows)
Last row: "Overall Average" spanning CA cols, 
showing total average and overall grade

[Horizontal divider]

--- AFFECTIVE DOMAIN (if showAffective) ---
Title: "Affective Domain Assessment"
Grid of traits with rating boxes:
| Trait | Excellent | Good | Fair | Poor |
One row per affectiveTrait from config
Filled checkmark in the appropriate column

--- PSYCHOMOTOR (if showPsychomotor) ---
Same grid layout as affective domain
Using psychomotorTraits from config

--- REMARKS SECTION ---
[if showTeacherRemark]
"Class Teacher's Remark: ________________"
"Signature: _________ Date: _________"

[if showPrincipalRemark]
"Principal's Remark: ________________"

--- FOOTER SECTION ---
Left: [if showStamp] School stamp image
Center: [if showResumptionDate] 
  "Next Term Begins: {config.nextTermDate}"
Right: [if showPoweredBy] 
  "Powered by Gradellence" (small, gray)

[if principalSignature image exists]
"Principal: {config.principalName}"
[signature image]

[if footerText] config.footerText in italic small text

--- QR CODE ---
Bottom right corner: small QR code encoding:
  "GRADELLENCE:{schoolId}:{studentId}:{termId}"
This is for verification purposes.
Use qrcode package (install if not in package.json).

═══════════════════════════════════════════════
PART C — MODERN TEMPLATE
═══════════════════════════════════════════════

Implement modernTemplate(doc, data, config):

Same data as classic but with these visual differences:

HEADER: Gradient bar in accentColor across full width
  School name in white over the bar
  Logo in a circle overlay

STUDENT INFO: Card-style box with light border
  Two columns of info inside

RESULTS: Cleaner table with:
  - No borders on rows, just bottom border
  - Colored total column (accentColor background)
  - Mini progress bar in each total cell showing 
    score as % of max (e.g. 72/100 = 72% filled bar)

PERFORMANCE SUMMARY BOX:
  Shows: Overall Average | Class Position | Grade
  In three colored stat boxes side by side

Everything else same as classic.

═══════════════════════════════════════════════
PART D — DETAILED TEMPLATE
═══════════════════════════════════════════════

Implement detailedTemplate(doc, data, config):

Same as classic but includes:
- Full affective domain section (always shown)
- Full psychomotor section (always shown)  
- Larger remarks section with more writing space
- Cumulative performance section showing 
  all 3 terms if showCumulative is true:
  | Term | Average | Position | Grade |
  | 1st  |  72.4   |  3rd     |   B   |
  | 2nd  |  68.1   |  5th     |   C   |
  | 3rd  |  75.2   |  2nd     |   B   |

═══════════════════════════════════════════════
PART E — PRIMARY TEMPLATE
═══════════════════════════════════════════════

Implement primaryTemplate(doc, data, config):

Simplified format appropriate for young children:
- Larger font sizes throughout (14pt body, 18pt headers)
- Fewer columns: | Subject | Score | Grade | Remark |
  (no CA breakdown — just total score)
- Larger affective domain section (more prominent)
- Simple smiley face icons for grades:
  A = 😊 Excellent, B = 🙂 Good, C = 😐 Fair, 
  F = 😟 Needs Improvement
  (use text equivalents if emoji rendering is unreliable
   in PDFs — "★★★★★" vs "★★★☆☆" etc.)
- Large "PROMOTED TO:" field at bottom if applicable
- Simpler footer, more visual

═══════════════════════════════════════════════
PART F — CONTROLLER ENDPOINT
═══════════════════════════════════════════════

In server/src/modules/results/results.controller.ts,
add this endpoint:

  @Get('report-card/:studentId/:termId')
  @ApiOperation({ summary: 'Download student report card PDF' })
  @ApiResponse({ 
    status: 200, 
    description: 'PDF file',
    content: { 'application/pdf': {} }
  })
  async downloadReportCard(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generateReportCard(
      studentId, termId, req.user.schoolId
    );
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 
        `attachment; filename="report-card-${studentId}-${termId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }

Inject PdfService into ResultsModule.
Import PdfModule (create it) in ResultsModule.

═══════════════════════════════════════════════
PART G — BROADSHEET BULK DOWNLOAD
═══════════════════════════════════════════════

Add a second endpoint for downloading ALL report 
cards for a class as a ZIP file:

  @Get('report-cards/class/:classId/:termId')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Download all report cards for a class as ZIP' 
  })
  async downloadClassReportCards(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    // 1. Get all enrolled students in this class/term
    // 2. Generate PDF for each student
    // 3. Bundle into ZIP using archiver package
    //    (install if not present: npm install archiver)
    // 4. Stream ZIP to response
    
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 
        `attachment; filename="report-cards-class-${classId}.zip"`,
    });
    
    archive.pipe(res);
    
    // Get enrolled students
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, termId },
      include: { student: true },
    });
    
    for (const enrollment of enrollments) {
      const pdf = await this.pdfService.generateReportCard(
        enrollment.studentId, termId, req.user.schoolId
      );
      archive.append(pdf, { 
        name: `${enrollment.student.firstName}-${enrollment.student.lastName}-report-card.pdf` 
      });
    }
    
    await archive.finalize();
  }

═══════════════════════════════════════════════
VERIFICATION
═══════════════════════════════════════════════

After completing all parts:

1. Run: cd server && npm run build
   Zero TypeScript errors required.

2. Confirm these endpoints exist:
   GET /api/v1/results/report-card/:studentId/:termId
   GET /api/v1/results/report-cards/class/:classId/:termId

3. Manually verify PDF generation logic is sound:
   - All 4 templates have implementations
   - Tenant validation is present
   - Published check is present
   - QR code is added to all templates

4. Report all files created or modified.
