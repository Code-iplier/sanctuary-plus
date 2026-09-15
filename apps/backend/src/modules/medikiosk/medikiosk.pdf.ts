import PDFDocument from 'pdfkit';

type ReportValue = unknown;

function printable(value: ReportValue): string {
  if (value === null || value === undefined || value === '') return 'Not reported';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(printable).join(', ');
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${printable(item)}`)
    .join('; ');
}

function items(value: ReportValue): string[] {
  if (Array.isArray(value)) return value.map(printable).filter(Boolean);
  if (value === null || value === undefined || value === '') return ['Not reported'];
  return [printable(value)];
}

export function createMediKioskPdf(input: {
  patientName: string;
  patientRecordId: string;
  generatedAt: string;
  report: Record<string, unknown>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'MediKiosk Clinical Intake Report', Author: 'Sanctuary+' } });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const teal = '#007f78';
    const navy = '#17233c';
    const muted = '#64748b';
    const line = '#dbe4ee';
    const report = input.report;

    document.fillColor(teal).fontSize(20).font('Helvetica-Bold').text('SANCTUARY+', { continued: true });
    document.fillColor(navy).fontSize(9).font('Helvetica').text('  |  MEDIKIOSK CLINICAL INTAKE REPORT');
    document.moveDown(0.4).strokeColor(teal).lineWidth(2).moveTo(48, document.y).lineTo(547, document.y).stroke();
    document.moveDown(0.8);
    document.fillColor(navy).fontSize(15).font('Helvetica-Bold').text('Patient voice intake');
    document.fillColor(muted).fontSize(9).font('Helvetica').text('Prepared for clinician review. This document records patient-reported information and is not a diagnosis.');
    document.moveDown(1);

    const boxTop = document.y;
    document.roundedRect(48, boxTop, 499, 62, 6).fillAndStroke('#f4f8fa', line);
    document.fillColor(navy).fontSize(9).font('Helvetica-Bold').text('PATIENT', 62, boxTop + 13);
    document.font('Helvetica').text(input.patientName || 'Patient', 62, boxTop + 28);
    document.font('Helvetica-Bold').text('ABHA ID (SYNTHETIC)', 270, boxTop + 13);
    document.font('Helvetica').text(input.patientRecordId, 270, boxTop + 28);
    document.font('Helvetica-Bold').text('GENERATED', 420, boxTop + 13);
    document.font('Helvetica').text(new Date(input.generatedAt).toLocaleString('en-IN'), 420, boxTop + 28, { width: 110 });
    document.y = boxTop + 82;

    const sections: Array<[string, string]> = [
      ['Symptoms and chief complaint', 'symptoms'],
      ['When the problem started', 'problemStarted'],
      ['Findings', 'findings'],
      ['Vitals', 'vitals'],
      ['Medications', 'medications'],
      ['Allergies and reactions', 'allergies'],
      ['Medical, family, and lifestyle history', 'history'],
    ];
    for (const [title, key] of sections) {
      if (document.y > 710) document.addPage();
      document.fillColor(teal).fontSize(10).font('Helvetica-Bold').text(title.toUpperCase(), 48, document.y, { width: 499 });
      document.moveDown(0.2).strokeColor(line).lineWidth(0.7).moveTo(48, document.y).lineTo(547, document.y).stroke();
      document.moveDown(0.35).fillColor(navy).fontSize(9).font('Helvetica');
      for (const item of items(report[key])) document.text(`• ${item}`, 62, document.y, { width: 480, paragraphGap: 3 });
      document.moveDown(0.65);
    }

    if (document.y > 690) document.addPage();
    document.fillColor(teal).fontSize(10).font('Helvetica-Bold').text('SAFETY SIGNALS', 48, document.y, { width: 499 });
    document.moveDown(0.25).fillColor(navy).fontSize(9).font('Helvetica');
    for (const item of items(report.safetySignals)) document.text(`• ${item}`, 62, document.y, { width: 480, paragraphGap: 3 });
    document.moveDown(0.7);
    const verificationTop = document.y;
    document.roundedRect(48, verificationTop, 499, 42, 6).fillAndStroke('#edf9f7', '#a7ded8');
    document.fillColor(teal).font('Helvetica-Bold').fontSize(9).text('PATIENT VERIFICATION', 62, verificationTop + 12);
    document.fillColor(navy).font('Helvetica').text('Confirmed by patient before report generation', 270, verificationTop + 12, { width: 260 });
    document.fillColor(muted).fontSize(8).text(`Synthetic ABHA ID: ${input.patientRecordId}  |  Confidential clinical document`, 48, 765, { align: 'center', width: 499 });
    document.end();
  });
}
