import { ReportCardData, ReportCardTemplate } from './report-card.types';
import {
  PAGE,
  CONTENT_WIDTH,
  drawLogo,
  drawFooter,
  drawDomainSection,
  lighten,
  resolveImage,
} from './render-helpers';

export class ModernTemplate implements ReportCardTemplate {
  readonly name = 'modern';

  async render(doc: any, data: ReportCardData): Promise<void> {
    const { school, student, className, termName, sessionName, results, summary, branding } = data;
    const accent = branding.accentColor || '#1a56db';
    const light = lighten(accent, 0.88);

    // Top accent band
    doc.rect(0, 0, doc.page.width, 110).fill(accent);
    await drawLogo(doc, school.logo, PAGE.margin, 30, 50);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18);
    doc.text(school.name.toUpperCase(), PAGE.margin + 62, 38, { width: CONTENT_WIDTH - 62 });
    if (branding.motto) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(lighten(accent, 0.6));
      doc.text(branding.motto, PAGE.margin + 62, 60, { width: CONTENT_WIDTH - 62 });
    }
    doc.font('Helvetica').fontSize(8).fillColor('#ffffff');
    doc.text('STUDENT REPORT CARD', PAGE.margin + 62, 80, { width: CONTENT_WIDTH - 62, characterSpacing: 1 });

    let y = 128;

    // Info chips
    const chip = (label: string, value: string, x: number, w: number) => {
      doc.roundedRect(x, y, w, 40, 5).fill(light);
      doc.fillColor('#555555').font('Helvetica').fontSize(7).text(label.toUpperCase(), x + 8, y + 7, { width: w - 16 });
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(9.5).text(value, x + 8, y + 19, { width: w - 16 });
    };
    const gap = 10;
    const chipW = (CONTENT_WIDTH - gap * 3) / 4;
    chip('Student', `${student.firstName} ${student.lastName}`, PAGE.margin, chipW);
    chip('Adm. No', student.admissionNumber, PAGE.margin + (chipW + gap), chipW);
    chip('Class', className, PAGE.margin + (chipW + gap) * 2, chipW);
    chip('Term', termName, PAGE.margin + (chipW + gap) * 3, chipW);
    y += 54;

    // Results table
    const cols = [
      { label: 'Subject', w: 200, align: 'left' },
      { label: 'Score', w: 70, align: 'center' },
      { label: 'Grade', w: 60, align: 'center' },
      { label: 'Remark', w: CONTENT_WIDTH - 330, align: 'center' },
    ];
    doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 20, 4).fill(accent);
    let x = PAGE.margin;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    for (const c of cols) { doc.text(c.label, x + 4, y + 6, { width: c.w - 8, align: c.align as any }); x += c.w; }
    y += 20;
    doc.font('Helvetica').fontSize(9);
    results.forEach((r, i) => {
      if (i % 2 === 0) doc.rect(PAGE.margin, y, CONTENT_WIDTH, 16).fill('#f4f6fa');
      x = PAGE.margin;
      doc.fillColor('#222222');
      const row = [r.subjectName, r.totalScore.toFixed(1), r.grade ?? '-', r.remark ?? '-'];
      cols.forEach((c, ci) => { doc.text(String(row[ci]), x + 4, y + 4, { width: c.w - 8, align: c.align as any }); x += c.w; });
      y += 16;
    });
    y += 12;

    // Summary cards
    const card = (label: string, value: string, cx: number, cw: number) => {
      doc.roundedRect(cx, y, cw, 44, 6).lineWidth(1).strokeColor(accent).stroke();
      doc.fillColor('#666666').font('Helvetica').fontSize(7).text(label.toUpperCase(), cx, y + 8, { width: cw, align: 'center' });
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(14).text(value, cx, y + 20, { width: cw, align: 'center' });
    };
    const cw = (CONTENT_WIDTH - gap * 2) / 3;
    card('Average', summary.average.toFixed(1), PAGE.margin, cw);
    card('GPA', summary.gpa.toFixed(2), PAGE.margin + cw + gap, cw);
    card('Grade', summary.overallGrade ?? '-', PAGE.margin + (cw + gap) * 2, cw);
    y += 56;
    doc.font('Helvetica').fontSize(9).fillColor('#222222');
    if (branding.showRanking && summary.position != null) {
      doc.text(`Class Position: ${summary.position} of ${summary.classSize ?? '-'}`, PAGE.margin, y);
      y += 14;
    }
    if (branding.showCumulative && summary.cumulativeGpa != null) {
      doc.text(`Cumulative GPA: ${summary.cumulativeGpa.toFixed(2)}`, PAGE.margin, y);
      y += 14;
    }
    y += 8;

    if (branding.showAffective && branding.affectiveTraits.length) {
      y = drawDomainSection(doc, 'Affective Domain', branding.affectiveTraits, accent, y) + 8;
    }
    if (branding.showPsychomotor && branding.psychomotorTraits.length) {
      y = drawDomainSection(doc, 'Psychomotor Domain', branding.psychomotorTraits, accent, y) + 8;
    }

    if (branding.showTeacherRemark) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#222222').text("Class Teacher's Remark:", PAGE.margin, y);
      y += 12;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#bbbbbb').stroke();
      y += 12;
    }
    if (branding.showPrincipalRemark) {
      doc.font('Helvetica-Bold').text("Principal's Remark:", PAGE.margin, y);
      y += 12;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#bbbbbb').stroke();
      y += 12;
    }
    if (branding.showResumptionDate && branding.nextTermDate) {
      doc.font('Helvetica-Bold').fillColor(accent).text(`Next Term Begins: ${branding.nextTermDate}`, PAGE.margin, y + 4);
      y += 18;
    }

    if (branding.showStamp) {
      const sig = branding.principalSignature || school.signatureUrl;
      const baseY = Math.max(y + 8, doc.page.height - 200);
      if (sig) { const img = await resolveImage(sig); if (img) { try { doc.image(img, PAGE.margin, baseY, { width: 90, height: 34 }); } catch {} } }
      if (branding.schoolStamp) { const img = await resolveImage(branding.schoolStamp); if (img) { try { doc.image(img, PAGE.margin + CONTENT_WIDTH - 90, baseY, { width: 80, height: 60 }); } catch {} } }
      doc.fontSize(8).fillColor('#666666').font('Helvetica');
      doc.text(branding.principalName ? `Principal: ${branding.principalName}` : 'Principal Signature', PAGE.margin, baseY + 40);
    }

    await drawFooter(doc, data);
  }
}
