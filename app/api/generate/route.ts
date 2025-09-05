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

  // PACIENTE
  const paciente = text.match(/PACIENTE\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const identificacion = text.match(/IDENTIFICACION\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const fechaNac = text.match(/FECHA NAC\.?\s*:\s*([\d]{2}[\/-][\d]{2}[\/-][\d]{4})/)?.[1]?.replace(/-/g, "/") || "";
  const sexo = text.match(/SEXO\s*:\s*(FEMENINO|MASCULINO)/i)?.[1]?.trim() || "";
  const nroOrden = text.match(/N° ORDEN\s*:\s*(\d+)/i)?.[1]?.trim() || "";
  const edad = text.match(/EDAD\s*:\s*([\d]+)\s*años/i)?.[1] || "";
  const ingreso = text.match(/INGRESO\s*:\s*([\d]{2}[\/-][\d]{2}[\/-][\d]{4}\s+[\d]{2}:[\d]{2})/)?.[1]?.replace(/-/g, "/") || "";
  const tDeMuestra = text.match(/T\. DE MUESTRA\s*:\s*([\d]{2}[\/-][\d]{2}[\/-][\d]{4}\s+[\d]{2}:[\d]{2})/)?.[1]?.replace(/-/g, "/") || "";
  const recepcion = text.match(/RECEPCIÓN\s*:\s*([\d]{2}[\/-][\d]{2}[\/-][\d]{4}\s+[\d]{2}:[\d]{2})/)?.[1]?.replace(/-/g, "/") || "";
  const procedencia = text.match(/PROCEDENCIA\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const area = text.match(/ÁREA\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const subprocedencia = text.match(/SUBPROCEDENCIA\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const ficha = text.match(/FICHA\s*:\s*(\d+)/i)?.[1]?.trim() || "";

  // Extract dates/times
  const recepcionMatch = text.match(/RECEPCIÓN:\s*\n(?:.*\n){2}(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/);
  const fecha = recepcionMatch?.[1].replace(/-/g, "/");  // convert 04-09-2025 → 04/09/2025

  const hora  = recepcionMatch?.[2] || "";

  // PERFIL HEMATOLÓGICO
  const hto = text.match(/([\d.,]+)\s*%?\s*HEMATOCRITO/i)?.[1] || "";
  const hb = text.match(/([\d.,]+)\s*g\/dL\s*HEMOGLOBINA/i)?.[1] || "";
  const eritro = text.match(/([\d.,]+)\s*mill[oó]n\/uL\s*RCTO DE ERITROCITOS/i)?.[1] || "";
  const vcm = text.match(/([\d.,]+)\s*fL\s*VCM/i)?.[1] || "";
  const hcm = text.match(/([\d.,]+)\s*pg\s*HCM/i)?.[1] || "";
  const chcm = text.match(/CHCM\s*[*]?\s*([\d.,]+)/i)?.[1] || "";
  const rcaNeutro = text.match(/([\d.,]+)\s*miles\/uL\s*RCTO ABSOLUTO NEUTR[ÓO]FILOS/i)?.[1] || "";
  const rcaLinfo = text.match(/([\d.,]+)\s*miles\/uL\s*RCTO ABSOLUTO LINFOCITOS/i)?.[1] || "";
  const rcaMono = text.match(/([\d.,]+)\s*miles\/uL\s*RCTO ABSOLUTO MONOCITOS/i)?.[1] || "";

  // CELULAS (?)
  const leucoMatch = text.match(/([\d.]+)\s*(miles\/uL|millón\/uL)?\s*R?CTO DE LEUCOCITOS/i);
  const leuco = leucoMatch ? parseFloat(leucoMatch[1]) * 1000 : null; // null if missing

  const neuPercent = text.match(/([\d.,]+)%\s*NEUTR[ÓO]FILOS/i)?.[1];
  const linfPercent = text.match(/([\d.,]+)%\s*LINFOCITOS/i)?.[1];
  const monoPercent = text.match(/([\d.,]+)%\s*MONOCITOS/i)?.[1];
  const eosinPercent = text.match(/([\d.,]+)%\s*EOSIN[ÓO]FILOS/i)?.[1];
  const basoPercent = text.match(/([\d.,]+)%\s*BAS[ÓO]FILOS/i)?.[1];

  const neu = leuco && neuPercent ? Math.round((parseFloat(neuPercent) / 100) * leuco).toString() : "";
  const linfocitos = leuco && linfPercent ? Math.round((parseFloat(linfPercent) / 100) * leuco).toString() : "";
  const mono = leuco && monoPercent ? Math.round((parseFloat(monoPercent) / 100) * leuco).toString() : "";
  const eosin = leuco && eosinPercent ? Math.round((parseFloat(eosinPercent) / 100) * leuco).toString() : "";
  const basofilos = leuco && basoPercent ? Math.round((parseFloat(basoPercent) / 100) * leuco).toString() : "";

  // ELECTROLITOS
  const sodio = text.match(/SODIO\s*([\d.,]+)/i)?.[1] || "";
  const potasio = text.match(/POTASIO\s*([\d.,]+)/i)?.[1] || "";
  const cloro = text.match(/CLORO\s*([\d.,]+)/i)?.[1] || "";

  // BIOQUÍMICA
  const crea = text.match(/([\d.,]+)\s*\[.*?\]\s*mg\/dL\s*CREATININA/i)?.[1] || "";
  const bun = text.match(/BUN\s*([\d.,]+)/i)?.[1] || "";
  const fosforo = text.match(/FÓSFORO\s*([\d.,]+)/i)?.[1] || "";
  const magnesio = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*MAGNESIO/i)?.[1] || "";
  const pcr = text.match(/PROTEÍNA C REACTIVA\s*([\d.,]+)/i)?.[1] || "";
  const glicada = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*%?\s*HEMOGLOBINA GLICOSILADA/i)?.[1] || "";
  const buncrea = bun && crea ? Math.round(parseFloat(bun) / parseFloat(crea)) : "";
  const albumina = text.match(/([\d.,]+)\s*\[.*?\]\s*g\/dL\s*ALBÚMINA/i)?.[1] || "";
  const plaqMatch = text.match(/([\d.]+)\s*miles\/uL\s*RCTO DE PLAQUETAS/i)?.[1] || "";
  const plaq = plaqMatch ? (parseFloat(plaqMatch) * 1000).toString() : "";


  // GASES ARTERIALES
  const ph = text.match(/([\d.,]+)\s*\[[^\]]*\]\s*PH/i)?.[1] || "";
  const pcodos = text.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*P\s*CO2/i)?.[1] || "";
  const podos = text.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*P\s*O2/i)?.[1] || "";
  const bicarb = text.match(/([\d.,]+)\s*\[[^\]]*\]\s*mmol\/L\s*HCO3/i)?.[1] || "";
  const tco2 = text.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*T\s*CO2/i)?.[1] || "";
  const base = text.match(/([\d.,]+)\s*\[[^\]]*\]\s*mmol\/L\s*EBVT/i)?.[1] || ""; //esta como BE en el flujograma
  const satO2 = text.match(/([\d.,]+)\s*\[[^\]]*\]%?\s*SATURACION\s*DE\s*O2/i)?.[1] || "";

  return { 
    fecha, hora, 
    hto, hb, vcm, leuco, eritro, hcm, chcm, neu, linfocitos, mono, eosin, basofilos,
    sodio, potasio, cloro, 
    crea, bun, fosforo, magnesio, pcr, glicada, buncrea, albumina, plaq,
    ph, pcodos, podos, bicarb, tco2, base, satO2
  };
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
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
