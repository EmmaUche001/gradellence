import { ReportCardData, ReportCardTemplate } from './report-card.types';
import {
  PAGE,
  CONTENT_WIDTH,
  drawLogo,
  drawFooter,
  drawRatingRow,
  lighten,
  resolveImage,
} from './render-helpers';

export class PrimaryTemplate implements ReportCardTemplate {
  readonly name = 'primary';

  async render(doc: any, data: ReportCardData): Promise<void> {
    const { school, student, className, termName, sessionName, results, summary, branding } = data;
    const accent = branding.accentColor || '#1a56db';
    const light = lighten(accent, 0.85);

    // Rounded friendly header
    doc.roundedRect(PAGE.margin - 8, 36, CONTENT_WIDTH + 16, 96, 12).fill(light);
    await drawLogo(doc, school.logo, doc.page.width / 2 - 26, 44, 52);
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(17);
    doc.text(school.name, PAGE.margin, 100, { width: CONTENT_WIDTH, align: 'center' });
    if (branding.motto) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#555555');
      doc.text(branding.motto, PAGE.margin, 118, { width: CONTENT_WIDTH, align: 'center' });
    }

    let y = 148;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(accent);
    doc.text('My Report Card', PAGE.margin, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 22;

    // Big friendly info
    doc.fontSize(11).fillColor('#222222').font('Helvetica-Bold');
    doc.text(`${student.firstName} ${student.lastName}`, PAGE.margin, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 16;
    doc.font('Helvetica').fontSize(9.5).fillColor('#555555');
    doc.text(`Class: ${className}    •    ${termName}, ${sessionName}    •    No: ${student.admissionNumber}`, PAGE.margin, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 24;

    // Simple results table
    const cols = [
      { label: 'Subject', w: 220, align: 'left' },
      { label: 'Score', w: 90, align: 'center' },
      { label: 'Grade', w: CONTENT_WIDTH - 310, align: 'center' },
    ];
    doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 22, 6).fill(accent);
    let x = PAGE.margin;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    for (const c of cols) { doc.text(c.label, x + 6, y + 6, { width: c.w - 12, align: c.align as any }); x += c.w; }
    y += 22;
    doc.font('Helvetica').fontSize(10);
    results.forEach((r, i) => {
      if (i % 2 === 0) doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 18, 4).fill('#f5f7fb');
      x = PAGE.margin;
      doc.fillColor('#222222');
      const row = [r.subjectName, r.totalScore.toFixed(0), r.grade ?? '-'];
      cols.forEach((c, ci) => { doc.text(String(row[ci]), x + 6, y + 4, { width: c.w - 12, align: c.align as any }); x += c.w; });
      y += 18;
    });
    y += 14;

    // Encouraging summary
    doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 46, 8).fill(light);
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(11);
    doc.text(`Average: ${summary.average.toFixed(1)}`, PAGE.margin + 16, y + 9);
    doc.text(`Grade: ${summary.overallGrade ?? '-'}`, PAGE.margin + 180, y + 9);
    if (branding.showRanking && summary.position != null) {
      doc.text(`Position: ${summary.position} of ${summary.classSize ?? '-'}`, PAGE.margin + 320, y + 9);
    }
    doc.font('Helvetica').fontSize(9).fillColor('#444444');
    doc.text(`Total Subjects: ${summary.subjectCount}`, PAGE.margin + 16, y + 27);
    if (branding.showCumulative && summary.cumulativeGpa != null) {
      doc.text(`Cumulative GPA: ${summary.cumulativeGpa.toFixed(2)}`, PAGE.margin + 180, y + 27);
    }
    y += 60;

    // Behaviour / skills with rating boxes
    if (branding.showAffective && branding.affectiveTraits.length) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(accent).text('How I Behave', PAGE.margin, y);
      y += 14;
      for (const t of branding.affectiveTraits) { drawRatingRow(doc, t, PAGE.margin + 6, y, CONTENT_WIDTH - 12, accent); y += 16; }
      y += 6;
    }
    if (branding.showPsychomotor && branding.psychomotorTraits.length) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(accent).text('My Skills', PAGE.margin, y);
      y += 14;
      for (const t of branding.psychomotorTraits) { drawRatingRow(doc, t, PAGE.margin + 6, y, CONTENT_WIDTH - 12, accent); y += 16; }
      y += 6;
    }

    if (branding.showTeacherRemark) {
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#222222').text("Teacher's Comment:", PAGE.margin, y);
      y += 13;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#bbbbbb').stroke();
      y += 13;
    }
    if (branding.showPrincipalRemark) {
      doc.font('Helvetica-Bold').text("Principal's Comment:", PAGE.margin, y);
      y += 13;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#bbbbbb').stroke();
      y += 13;
    }
    if (branding.showResumptionDate && branding.nextTermDate) {
      doc.font('Helvetica-Bold').fillColor(accent).text(`We resume on: ${branding.nextTermDate}`, PAGE.margin, y + 4);
      y += 18;
    }

    if (branding.showStamp) {
      const sig = branding.principalSignature || school.signatureUrl;
      const baseY = Math.max(y + 6, doc.page.height - 200);
      if (sig) { const img = await resolveImage(sig); if (img) { try { doc.image(img, PAGE.margin, baseY, { width: 90, height: 34 }); } catch {} } }
      if (branding.schoolStamp) { const img = await resolveImage(branding.schoolStamp); if (img) { try { doc.image(img, PAGE.margin + CONTENT_WIDTH - 90, baseY, { width: 80, height: 60 }); } catch {} } }
      doc.fontSize(8).fillColor('#666666').font('Helvetica');
      doc.text(branding.principalName ? `Principal: ${branding.principalName}` : 'Principal Signature', PAGE.margin, baseY + 40);
    }

    await drawFooter(doc, data);
  }
}
