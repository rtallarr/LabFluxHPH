import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import pdf from "pdf-parse";

async function parseLabPdf(buffer: Buffer) {
  const data = await pdf(buffer);
  const text = data.text;
  //console.log("PDF Text:", text);

  // Extract dates/times
  const recepcionMatch = text.match(/RECEPCIÓN:\s*\n(?:.*\n){2}(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/);
  const fecha = recepcionMatch?.[1] || "";
  const hora  = recepcionMatch?.[2] || "";

  // Extract lab values (tolerating optional * and spaces)
  const hto = text.match(/([\d.,]+)\s*%?\s*HEMATOCRITO/i)?.[1] || "";
  const hb = text.match(/([\d.,]+)\s*g\/dL\s*HEMOGLOBINA/i)?.[1] || "";
  const eritro = text.match(/([\d.,]+)\s*mill[oó]n\/uL\s*RCTO DE ERITROCITOS/i)?.[1] || "";
  const vcm = text.match(/([\d.,]+)\s*fL\s*VCM/i)?.[1] || "";
  const hcm = text.match(/([\d.,]+)\s*pg\s*HCM/i)?.[1] || "";
  const leuco = text.match(/([\d.,]+)\s*(miles\/uL|millón\/uL)?\s*R?CTO DE LEUCOCITOS/i)?.[1] || "";
  const neutro = text.match(/([\d.,]+)%\s*NEUTR[ÓO]FILOS/i)?.[1] || "";
  const linfo = text.match(/([\d.,]+)%\s*LINFOCITOS/i)?.[1] || "";
  const mono = text.match(/([\d.,]+)%\s*MONOCITOS/i)?.[1] || "";
  const eosi = text.match(/([\d.,]+)%\s*EOSIN[ÓO]FILOS/i)?.[1] || "";
  const baso = text.match(/([\d.,]+)%\s*BAS[ÓO]FILOS/i)?.[1] || "";
  const rcaNeutro = text.match(/([\d.,]+)\s*miles\/uL\s*RCTO ABSOLUTO NEUTR[ÓO]FILOS/i)?.[1] || "";
  const rcaLinfo = text.match(/([\d.,]+)\s*miles\/uL\s*RCTO ABSOLUTO LINFOCITOS/i)?.[1] || "";
  const rcaMono = text.match(/([\d.,]+)\s*miles\/uL\s*RCTO ABSOLUTO MONOCITOS/i)?.[1] || "";


  return { fecha, hora, hto, hb, vcm, leuco, eritro, hcm, neutro, linfo, mono, eosi, baso, rcaNeutro, rcaLinfo, rcaMono };
}

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Load DOCX template
    const templatePath = path.join(process.cwd(), "assets", "template.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });

    // Parse each PDF and create placeholder set
    const placeholdersArray = await Promise.all(
      files.map(async (file, idx) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await parseLabPdf(buffer);
        console.log(`Parsed File ${idx + 1}:`, parsed);
        const pdfIndex = idx + 1;

        // Add suffix (_1, _2, etc.) to keys
        return Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [`${k}_${pdfIndex}`, v])
        );
      })
    );

    // Merge all placeholders into a single object
    const mergedPlaceholders = Object.assign({}, ...placeholdersArray);
    //console.log("Merged Placeholders:", mergedPlaceholders, "Placeholders Array:", placeholdersArray);

    // Render template with extracted data
    doc.render(mergedPlaceholders);
    const finalBuffer = doc.getZip().generate({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=LabFluxHPH.docx`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
};
