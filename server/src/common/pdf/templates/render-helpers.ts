import { ReportCardData } from './report-card.types';

export const PAGE = { width: 595.28, height: 841.89, margin: 50 };
export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

export function lighten(hex: string, amount = 0.85): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#eef2f7';
  const num = parseInt(c, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export async function resolveImage(src: string | null): Promise<Buffer | null> {
  if (!src) return null;
  try {
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1] || '';
      return Buffer.from(base64, 'base64');
    }
    if (typeof fetch === 'function') {
      const res = await fetch(src);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function drawLogo(doc: any, logo: string | null, x: number, y: number, size = 50) {
  const img = await resolveImage(logo);
  if (img) {
    try {
      doc.image(img, x, y, { width: size, height: size });
    } catch {
      /* ignore */
    }
  }
}

export function drawWatermark(doc: any, text = 'GRADELLENCE') {
  doc.save();
  doc.fontSize(48).font('Helvetica').fillColor('#dddddd');
  doc.translate(doc.page.width / 2, doc.page.height / 2);
  doc.rotate(-30);
  doc.text(text, 0, 0, { align: 'center', width: 400, opacity: 0.12 });
  doc.restore();
}

export async function drawFooter(doc: any, data: ReportCardData) {
  const { branding, qrDataUrl } = data;
  const footerY = doc.page.height - 90;

  if (qrDataUrl) {
    const img = await resolveImage(qrDataUrl);
    if (img) {
      try {
        doc.image(img, doc.page.width - PAGE.margin - 64, footerY - 6, { width: 64, height: 64 });
        doc.fontSize(6.5).fillColor('#888888');
        doc.text('Scan to verify', doc.page.width - PAGE.margin - 64, footerY + 60, {
          width: 64,
          align: 'center',
        });
      } catch {
        /* ignore */
      }
    }
  }

  doc.fontSize(7).fillColor('#888888').font('Helvetica');
  const leftX = PAGE.margin;
  if (branding.footerText) {
    doc.text(branding.footerText, leftX, footerY, { width: 320 });
  }
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, leftX, footerY + 22);
  doc.text('This is a computer-generated document.', leftX, footerY + 33);
  if (branding.showPoweredBy) {
    doc.fontSize(7).fillColor('#aaaaaa');
    doc.text('Powered by Gradellence', leftX, footerY + 48);
  }
}

export function drawRatingRow(
  doc: any,
  label: string,
  x: number,
  y: number,
  width: number,
  accent: string,
) {
  doc.fontSize(8).font('Helvetica').fillColor('#333333');
  doc.text(label, x, y, { width: width - 70 });
  const boxSize = 9;
  const gap = 5;
  const startX = x + width - 5 * (boxSize + gap);
  for (let i = 0; i < 5; i++) {
    doc
      .rect(startX + i * (boxSize + gap), y, boxSize, boxSize)
      .lineWidth(0.7)
      .strokeColor(accent)
      .stroke();
  }
}

export function drawDomainSection(
  doc: any,
  title: string,
  traits: string[],
  accent: string,
  startY: number,
): number {
  let y = startY;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(accent);
  doc.text(title.toUpperCase(), PAGE.margin, y);
  y += 13;
  doc.font('Helvetica').fillColor('#333333');
  for (const trait of traits) {
    drawRatingRow(doc, trait, PAGE.margin + 6, y, CONTENT_WIDTH - 12, accent);
    y += 15;
  }
  return y;
}
