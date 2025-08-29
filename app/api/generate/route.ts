import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'Upload at least one PDF or ZIP.' }, { status: 400 });
  }

  const pdfBuffers: Buffer[] = [];

  // Extract PDFs from uploads and ZIPs
  for (const f of files) {
    const arrayBuffer = await f.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    if (f.name.toLowerCase().endsWith('.zip')) {
      const zip = await JSZip.loadAsync(buf);
      for (const name of Object.keys(zip.files)) {
        if (name.toLowerCase().endsWith('.pdf')) {
          const pdfBuf = await zip.files[name].async('nodebuffer');
          pdfBuffers.push(pdfBuf);
        }
      }
    } else if (f.name.toLowerCase().endsWith('.pdf')) {
      pdfBuffers.push(buf);
    }
  }

  if (pdfBuffers.length === 0) {
    return NextResponse.json({ error: 'No valid PDFs found.' }, { status: 400 });
  }

  // Parse PDFs (simple text extraction example)
  const allTexts: string[] = [];
  for (const pdfBuf of pdfBuffers) {
    const data = await pdfParse(pdfBuf);
    allTexts.push(data.text);
  }

  // Build context (replace your Python logic here)
  const ctx = {
    pdfTexts: allTexts,
    generatedAt: new Date().toISOString(),
  };

  // Generate DOCX
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: allTexts.map((txt, idx) =>
          new Paragraph({
            children: [new TextRun({ text: `PDF ${idx + 1}:\n${txt}`, break: 1 })],
          })
        ),
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(docxBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename=LabFluxHPH.docx',
    },
  });
}
