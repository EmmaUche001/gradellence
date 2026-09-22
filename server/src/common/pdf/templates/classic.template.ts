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

export class ClassicTemplate implements ReportCardTemplate {
  readonly name = 'classic';

  async render(doc: any, data: ReportCardData): Promise<void> {
    const { school, student, className, termName, sessionName, results, summary, branding } = data;
    const accent = branding.accentColor || '#1a56db';
    const light = lighten(accent);

    // Header
    await drawLogo(doc, school.logo, doc.page.width / 2 - 25, 42, 50);
    let y = 100;
    doc.fontSize(17).font('Helvetica-Bold').fillColor(accent);
    doc.text(school.name.toUpperCase(), PAGE.margin, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 20;
    if (branding.motto) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666');
      doc.text(`"${branding.motto}"`, PAGE.margin, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 13;
    }
    const contact = [school.address, school.phone, school.email].filter(Boolean).join('  |  ');
    if (contact) {
      doc.fontSize(7.5).font('Helvetica').fillColor('#888888');
      doc.text(contact, PAGE.margin, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 12;
    }
    y += 4;
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(1.4).strokeColor(accent).stroke();
    y += 8;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#222222');
    doc.text('STUDENT REPORT CARD', PAGE.margin, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 18;

    // Student info box
    doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 52, 4).fillAndStroke(light, accent);
    doc.fillColor('#222222').font('Helvetica').fontSize(9);
    const colL = PAGE.margin + 12;
    const colR = PAGE.margin + CONTENT_WIDTH / 2 + 6;
    doc.font('Helvetica-Bold').text('Student:', colL, y + 9, { continued: true }).font('Helvetica').text(`  ${student.firstName} ${student.lastName}`);
    doc.font('Helvetica-Bold').text('Admission No:', colL, y + 22, { continued: true }).font('Helvetica').text(`  ${student.admissionNumber}`);
    doc.font('Helvetica-Bold').text('Class:', colR, y + 9, { continued: true }).font('Helvetica').text(`  ${className}`);
    doc.font('Helvetica-Bold').text('Term:', colR, y + 22, { continued: true }).font('Helvetica').text(`  ${termName} — ${sessionName}`);
    y += 64;

    // Results table
    const cols = [
      { label: 'Subject', w: 200, align: 'left' },
      { label: 'Score', w: 70, align: 'center' },
      { label: 'Grade', w: 60, align: 'center' },
      { label: 'Remark', w: CONTENT_WIDTH - 330, align: 'center' },
    ];
    doc.rect(PAGE.margin, y, CONTENT_WIDTH, 18).fill(accent);
    let x = PAGE.margin;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    for (const c of cols) {
      doc.text(c.label, x + 4, y + 5, { width: c.w - 8, align: c.align as any });
      x += c.w;
    }
    y += 18;
    doc.font('Helvetica').fontSize(9);
    results.forEach((r, i) => {
      if (i % 2 === 0) doc.rect(PAGE.margin, y, CONTENT_WIDTH, 16).fill('#f6f8fb');
      x = PAGE.margin;
      doc.fillColor('#222222');
      const row = [r.subjectName, r.totalScore.toFixed(1), r.grade ?? '-', r.remark ?? '-'];
      cols.forEach((c, ci) => {
        doc.text(String(row[ci]), x + 4, y + 4, { width: c.w - 8, align: c.align as any });
        x += c.w;
      });
      y += 16;
    });
    doc.rect(PAGE.margin, y - results.length * 16 - 18, CONTENT_WIDTH, results.length * 16 + 18).lineWidth(0.6).strokeColor('#cccccc').stroke();
    y += 10;

    // Summary
    doc.fontSize(10).font('Helvetica-Bold').fillColor(accent);
    doc.text('PERFORMANCE SUMMARY', PAGE.margin, y);
    y += 15;
    doc.fontSize(9).font('Helvetica').fillColor('#222222');
    doc.text(`Total Subjects: ${summary.subjectCount}`, PAGE.margin, y);
    doc.text(`Average Score: ${summary.average.toFixed(1)}`, PAGE.margin + 150, y);
    doc.text(`Overall Grade: ${summary.overallGrade ?? '-'}`, PAGE.margin + 300, y);
    y += 14;
    doc.text(`Term GPA: ${summary.gpa.toFixed(2)}`, PAGE.margin, y);
    if (branding.showRanking && summary.position != null) {
      doc.text(`Position: ${summary.position} of ${summary.classSize ?? '-'}`, PAGE.margin + 150, y);
    }
    if (branding.showCumulative && summary.cumulativeGpa != null) {
      doc.text(`Cumulative GPA: ${summary.cumulativeGpa.toFixed(2)}`, PAGE.margin + 300, y);
    }
    y += 22;

    // Affective / Psychomotor
    if (branding.showAffective && branding.affectiveTraits.length) {
      y = drawDomainSection(doc, 'Affective Domain', branding.affectiveTraits, accent, y) + 8;
    }
    if (branding.showPsychomotor && branding.psychomotorTraits.length) {
      y = drawDomainSection(doc, 'Psychomotor Domain', branding.psychomotorTraits, accent, y) + 8;
    }

    // Remarks
    if (branding.showTeacherRemark) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#222222').text("Class Teacher's Remark:", PAGE.margin, y);
      y += 12;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#999999').stroke();
      y += 12;
    }
    if (branding.showPrincipalRemark) {
      doc.font('Helvetica-Bold').text("Principal's Remark:", PAGE.margin, y);
      y += 12;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#999999').stroke();
      y += 12;
    }
    if (branding.showResumptionDate && branding.nextTermDate) {
      doc.font('Helvetica-Bold').fillColor(accent).text(`Next Term Begins: ${branding.nextTermDate}`, PAGE.margin, y + 4);
      y += 18;
    }

    // Stamp / signature
    if (branding.showStamp) {
      const sig = branding.principalSignature || school.signatureUrl;
      const stampImg = branding.schoolStamp;
      const baseY = Math.max(y + 10, doc.page.height - 200);
      if (sig) {
        const img = await resolveImage(sig);
        if (img) { try { doc.image(img, PAGE.margin, baseY, { width: 90, height: 34 }); } catch {} }
      }
      if (stampImg) {
        const img = await resolveImage(stampImg);
        if (img) { try { doc.image(img, PAGE.margin + CONTENT_WIDTH - 90, baseY, { width: 80, height: 60 }); } catch {} }
      }
      doc.fontSize(8).fillColor('#666666').font('Helvetica');
      doc.text(branding.principalName ? `Principal: ${branding.principalName}` : 'Principal Signature', PAGE.margin, baseY + 40);
    }

    await drawFooter(doc, data);
  }
}
