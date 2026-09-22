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

export class DetailedTemplate implements ReportCardTemplate {
  readonly name = 'detailed';

  async render(doc: any, data: ReportCardData): Promise<void> {
    const { school, student, className, termName, sessionName, results, summary, branding, gradeScales } = data;
    const accent = branding.accentColor || '#1a56db';
    const light = lighten(accent);

    // Formal bordered header
    doc.rect(PAGE.margin - 10, 36, CONTENT_WIDTH + 20, 92).lineWidth(1.5).strokeColor(accent).stroke();
    doc.rect(PAGE.margin - 6, 40, CONTENT_WIDTH + 12, 84).lineWidth(0.5).strokeColor(accent).stroke();
    await drawLogo(doc, school.logo, PAGE.margin + 4, 52, 56);
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(16);
    doc.text(school.name.toUpperCase(), PAGE.margin + 70, 52, { width: CONTENT_WIDTH - 70, align: 'center' });
    let hy = 72;
    if (branding.motto) {
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#555555');
      doc.text(branding.motto, PAGE.margin + 70, hy, { width: CONTENT_WIDTH - 70, align: 'center' });
      hy += 12;
    }
    const contact = [school.address, school.phone, school.email].filter(Boolean).join('  |  ');
    if (contact) {
      doc.font('Helvetica').fontSize(7).fillColor('#777777');
      doc.text(contact, PAGE.margin + 70, hy, { width: CONTENT_WIDTH - 70, align: 'center' });
      hy += 11;
    }
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#222222');
    doc.text('TERMINAL REPORT CARD', PAGE.margin + 70, hy + 2, { width: CONTENT_WIDTH - 70, align: 'center' });

    let y = 142;

    // Student info grid
    doc.fontSize(8.5).fillColor('#222222');
    const info: Array<[string, string]> = [
      ['Student Name', `${student.firstName} ${student.lastName}`],
      ['Admission Number', student.admissionNumber],
      ['Class', className],
      ['Term', termName],
      ['Session', sessionName],
    ];
    if (branding.showRanking && summary.position != null) {
      info.push(['Class Position', `${summary.position} of ${summary.classSize ?? '-'}`]);
    }
    const half = Math.ceil(info.length / 2);
    const colW = CONTENT_WIDTH / 2;
    info.forEach(([k, v], i) => {
      const cx = i < half ? PAGE.margin : PAGE.margin + colW;
      const cy = y + (i < half ? i : i - half) * 15;
      doc.font('Helvetica-Bold').text(`${k}:`, cx, cy, { continued: true }).font('Helvetica').text(`  ${v}`);
    });
    y += half * 15 + 8;

    // Results table with points column
    const cols = [
      { label: 'Subject', w: 180, align: 'left' },
      { label: 'Score', w: 60, align: 'center' },
      { label: 'Grade', w: 55, align: 'center' },
      { label: 'Points', w: 55, align: 'center' },
      { label: 'Remark', w: CONTENT_WIDTH - 350, align: 'center' },
    ];
    doc.rect(PAGE.margin, y, CONTENT_WIDTH, 18).fill(accent);
    let x = PAGE.margin;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
    for (const c of cols) { doc.text(c.label, x + 4, y + 5, { width: c.w - 8, align: c.align as any }); x += c.w; }
    y += 18;
    doc.font('Helvetica').fontSize(8.5);
    results.forEach((r, i) => {
      if (i % 2 === 0) doc.rect(PAGE.margin, y, CONTENT_WIDTH, 15).fill('#f7f8fb');
      x = PAGE.margin;
      doc.fillColor('#222222');
      const row = [r.subjectName, r.totalScore.toFixed(1), r.grade ?? '-', r.points != null ? r.points.toFixed(1) : '-', r.remark ?? '-'];
      cols.forEach((c, ci) => { doc.text(String(row[ci]), x + 4, y + 4, { width: c.w - 8, align: c.align as any }); x += c.w; });
      y += 15;
    });
    doc.rect(PAGE.margin, y - results.length * 15 - 18, CONTENT_WIDTH, results.length * 15 + 18).lineWidth(0.6).strokeColor('#cccccc').stroke();
    y += 10;

    // Summary
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(accent).text('ACADEMIC SUMMARY', PAGE.margin, y);
    y += 14;
    doc.fontSize(8.5).font('Helvetica').fillColor('#222222');
    doc.text(`Subjects: ${summary.subjectCount}`, PAGE.margin, y);
    doc.text(`Total: ${summary.totalScore.toFixed(1)}`, PAGE.margin + 120, y);
    doc.text(`Average: ${summary.average.toFixed(1)}`, PAGE.margin + 230, y);
    doc.text(`Grade: ${summary.overallGrade ?? '-'}`, PAGE.margin + 340, y);
    y += 13;
    doc.text(`Term GPA: ${summary.gpa.toFixed(2)}`, PAGE.margin, y);
    if (branding.showCumulative && summary.cumulativeGpa != null) {
      doc.text(`Cumulative GPA: ${summary.cumulativeGpa.toFixed(2)}`, PAGE.margin + 120, y);
    }
    y += 16;

    // Grading key
    if (gradeScales && gradeScales.length) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(accent).text('GRADING KEY', PAGE.margin, y);
      y += 12;
      doc.font('Helvetica').fontSize(7.5).fillColor('#444444');
      const key = gradeScales.map((g) => `${g.grade} (${g.minScore}-${g.maxScore})`).join('   ');
      doc.text(key, PAGE.margin, y, { width: CONTENT_WIDTH });
      y += 16;
    }

    if (branding.showAffective && branding.affectiveTraits.length) {
      y = drawDomainSection(doc, 'Affective Domain', branding.affectiveTraits, accent, y) + 6;
    }
    if (branding.showPsychomotor && branding.psychomotorTraits.length) {
      y = drawDomainSection(doc, 'Psychomotor Domain', branding.psychomotorTraits, accent, y) + 6;
    }

    if (branding.showTeacherRemark) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#222222').text("Class Teacher's Remark:", PAGE.margin, y);
      y += 11;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#999999').stroke();
      y += 11;
    }
    if (branding.showPrincipalRemark) {
      doc.font('Helvetica-Bold').text("Principal's Remark:", PAGE.margin, y);
      y += 11;
      doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor('#999999').stroke();
      y += 11;
    }
    if (branding.showResumptionDate && branding.nextTermDate) {
      doc.font('Helvetica-Bold').fillColor(accent).text(`Next Term Begins: ${branding.nextTermDate}`, PAGE.margin, y + 3);
      y += 16;
    }

    if (branding.showStamp) {
      const sig = branding.principalSignature || school.signatureUrl;
      const baseY = Math.max(y + 6, doc.page.height - 200);
      if (sig) { const img = await resolveImage(sig); if (img) { try { doc.image(img, PAGE.margin, baseY, { width: 90, height: 34 }); } catch {} } }
      if (branding.schoolStamp) { const img = await resolveImage(branding.schoolStamp); if (img) { try { doc.image(img, PAGE.margin + CONTENT_WIDTH - 90, baseY, { width: 80, height: 60 }); } catch {} } }
      doc.fontSize(7.5).fillColor('#666666').font('Helvetica');
      doc.text(branding.principalName ? `Principal: ${branding.principalName}` : 'Principal Signature', PAGE.margin, baseY + 40);
    }

    await drawFooter(doc, data);
  }
}
