import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import pdf from "pdf-parse";

function parseFechaHora(fecha: string, hora: string): Date {
  const [day, month, year] = fecha.split("/").map(Number);
  const [hours, minutes] = hora.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function exportData(data: string, filename: string) {
  const exportDir = path.join(process.cwd(), "assets", "parsed_data");

  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const exportPath = path.join(process.cwd(), "assets", "parsed_data", filename+".json");
  fs.writeFileSync(exportPath, data);
  //console.log(`Data exported to ${exportPath}`);
}

function pdfExportData(data: string, nombre: string, fecha: string, hora: string) {
  const filename = nombre.split(" ")[0] + fecha.replace(/\//g, "-") + "_" + hora.replace(/:/g, "_");
  const exportDir = path.join(process.cwd(), "assets", "pdf_data");

  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const exportPath = path.join(process.cwd(), "assets", "pdf_data", filename+".txt");
  fs.writeFileSync(exportPath, data);
  //console.log(`Data exported to ${exportPath}`);
}

function splitExams(text: string): { type: string; content: string }[] {
  const examRegex = /(ORINA COMPLETA.*|PERFIL HEMATOL[ÓO]GICO.*|BIOQU[IÍ]MICA.*|HEMOSTASIA.*|[AÁ]REA:\s*QU[ÍI]MICA|.*CULTIVO.*)/gi;
  const matches = [...text.matchAll(examRegex)];

  const exams: { type: string; content: string }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index!;
    const endIndex = matches[i + 1]?.index ?? text.length;
    const type = matches[i][0].trim();
    const content = text.slice(startIndex, endIndex);

    if (type.includes("ORINA COMPLETA") || type.includes("CULTIVO")) {
      exams.push({ type, content });
    } else {
      const existing = exams.find((s) => s.type === "EXÁMENES GENERALES");
      if (existing) {
        existing.content += "\n" + content;
      } else {
        exams.push({ type: "EXÁMENES GENERALES", content });
      }
    }
  }
  return exams;
}

async function parseLabPdf(buffer: Buffer, count: number) {
  const data = await pdf(buffer);
  const text = data.text;

  const exams = splitExams(text);
  //exportData(JSON.stringify(exams, null, 2), "exams_data"+count);

  const nombre = text.match(/PACIENTE\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const rut = text.match(/IDENTIFICACION\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const sexo = text.match(/\b(FEMENINO|MASCULINO)\b/i)?.[1] || "";
  const edad = text.match(/(\d+)\s*años/i)?.[1] || "";

  const parsedExams = exams.map((exam) => {

    const recepcionMatch = exam.content.match(/RECEPCIÓN:[\s\S]*\n\d{2}[\/-]\d{2}[\/-]\d{4}\s\d{2}:\d{2}\n(\d{2}[\/-]\d{2}[\/-]\d{4})\s(\d{2}:\d{2})/);

    if (exam.type.includes("ORINA COMPLETA")) {
      const fechaoc = recepcionMatch?.[1].replace(/-/g, "/") || "";
      const horaoc = recepcionMatch?.[2] || "";

      if (process.env.NODE_ENV === "development") {
        pdfExportData(text, nombre, fechaoc, horaoc);
      }

      // ORINA
      const coloroc = exam.content.match(/COLOR\s*([A-Za-z]+)/i)?.[1] || "";
      const aspectooc = exam.content.match(/ASPECTO([A-Za-z]+)Transparente/i)?.[1] || "";
      const densoc = exam.content.match(/(\d+\.\d+)\s*1\.005\s*-\s*1\.025/i)?.[1] || "";
      const phoc = exam.content.match(/pH([\d.,]+)5\.0 - 7\.0/i)?.[1] || "";
      const nitritosoc = exam.content.match(/NITRITOS\s*([A-Za-z0-9]+)Negativo/i)?.[1] || "";
      const protoc = exam.content.match(/PROTEINAS\s*([A-Za-z0-9]+)Negativo/i)?.[1] || "";
      const cetonasoc = exam.content.match(/CUERPOS CETÓNICOS\s*([A-Za-z0-9]+)Negativo/i)?.[1] || "";
      const glucosaoc = exam.content.match(/GLUCOSA\s*([A-Za-z0-9]+)Normal/i)?.[1] || "";
      const urobiloc = exam.content.match(/UROBILINÓGENO\s*([A-Za-z0-9]+)Normal/i)?.[1] || "";
      const bilioc = exam.content.match(/BILIRRUBINA\s*([A-Za-z0-9]+)Negativo/i)?.[1] || "";
      const mucusoc = exam.content.match(/MUCUS\s*(.*)/i)?.[1] || "";
      const globRojos = exam.content.match(/GLOBULOS ROJOS\s*([A-Za-z0-9]+)Negativo/i)?.[1] || "";
      const leucosoc = exam.content.match(/LEUCOCITOS\s*(.*)\s*0\s*-\s*4/i)?.[1] || "";
      const groc = exam.content.match(/ERITROCITOS\s*(.*)\s*0\s*-\s*4/i)?.[1] || "";
      const bactoc = exam.content.match(/BACTERIAS\s*(.*)No se/i)?.[1] || "";
      const hialoc = exam.content.match(/CILINDROS HIALINOS\s*(.*)/i)?.[1] || "";
      const granuloc = exam.content.match(/CILINDROS GRANULOSOS\s*(.*)/i)?.[1] || "";
      const epiteloc = exam.content.match(/CÉLULAS EPITELIALES\s*(.*)/i)?.[1] || "";
      const cristaloc = exam.content.match(/CRISTALES\s*(.*)/i)?.[1] || "";
      const levadoc = exam.content.match(/LEVADURAS\s*(.*)/i)?.[1] || "";

      return {
        type: exam.type,
        nombre, rut, edad, sexo, fechaoc, horaoc,
        coloroc, aspectooc, densoc, phoc, leucosoc, groc, nitritosoc, protoc, cetonasoc, glucosaoc, urobiloc, bilioc, mucusoc, bactoc, hialoc, granuloc, epiteloc, cristaloc, levadoc,
      };

    } else if (exam.type.includes("CULTIVOS")) {
      const fechacul = recepcionMatch?.[1].replace(/-/g, "/") || "";
      const horacul = recepcionMatch?.[2] || "";

      if (process.env.NODE_ENV === "development") {
        pdfExportData(text, nombre, fechacul, horacul);
      }

      // CULTIVOS

      return {
        type: exam.type,
        nombre, rut, edad, sexo, fechacul, horacul,
      };

    } else {
      const fecha = recepcionMatch?.[1].replace(/-/g, "/") || "";
      const hora = recepcionMatch?.[2] || "";

      if (process.env.NODE_ENV === "development") {
        pdfExportData(text, nombre, fecha, hora);
      }

      // PERFIL HEMATOLÓGICO
      const hto = exam.content.match(/([\d.,]+)\s*%?\s*HEMATOCRITO/i)?.[1] || "";
      const hb = exam.content.match(/([\d.,]+)\s*g\/dL\s*HEMOGLOBINA/i)?.[1] || "";
      const eritro = exam.content.match(/([\d.,]+)\s*mill[oó]n\/uL\s*RCTO DE ERITROCITOS/i)?.[1] || "";
      const vcm = exam.content.match(/([\d.,]+)\s*fL\s*VCM/i)?.[1] || "";
      const hcm = exam.content.match(/([\d.,]+)\s*pg\s*HCM/i)?.[1] || "";
      const chcm = exam.content.match(/CHCM\s*[*]?\s*([\d.,]+)/i)?.[1] || "";

      // CELULAS
      const leucoMatch = exam.content.match(/([\d.]+)\s*(miles\/uL|millón\/uL)?\s*R?CTO DE LEUCOCITOS/i);
      const leuco = leucoMatch ? parseFloat(leucoMatch[1]) * 1000 : null;

      const neuPercent = exam.content.match(/([\d.,]+)%\s*NEUTR[ÓO]FILOS/i)?.[1];
      const linfPercent = exam.content.match(/([\d.,]+)%\s*LINFOCITOS/i)?.[1];
      const monoPercent = exam.content.match(/([\d.,]+)%\s*MONOCITOS/i)?.[1];
      const eosinPercent = exam.content.match(/([\d.,]+)%\s*EOSIN[ÓO]FILOS/i)?.[1];
      const basoPercent = exam.content.match(/([\d.,]+)%\s*BAS[ÓO]FILOS/i)?.[1];

      const neu = leuco && neuPercent ? Math.round((parseFloat(neuPercent) / 100) * leuco).toString() : "";
      const linfocitos = leuco && linfPercent ? Math.round((parseFloat(linfPercent) / 100) * leuco).toString() : "";
      const mono = leuco && monoPercent ? Math.round((parseFloat(monoPercent) / 100) * leuco).toString() : "";
      const eosin = leuco && eosinPercent ? Math.round((parseFloat(eosinPercent) / 100) * leuco).toString() : "";
      const basofilos = leuco && basoPercent ? Math.round((parseFloat(basoPercent) / 100) * leuco).toString() : "";


      // ELECTROLITOS
      const sodio = exam.content.match(/([\d.,]+)\[[^\]]+\]mEq\/L\s*SODIO/i)?.[1] || "";
      const potasio = exam.content.match(/([\d.,]+)\[[^\]]+\]mEq\/L\s*POTASIO/i)?.[1] || "";
      const cloro = exam.content.match(/([\d.,]+)\[[^\]]+\]mEq\/L\s*CLORO/i)?.[1] || "";

      // BIOQUÍMICA
      const glucosa = exam.content.match(/GLUCOSA\s*([A-Za-z0-9]+)Normal/i)?.[1] || "";
      const coltotal = exam.content.match(/([\d.,]+)\s*\[Ideal/i)?.[1] || "";
      const hdl = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*mg\/dL\s*COLESTEROL HDL/i)?.[1] || "";
      const tgl = exam.content.match(/([\d.,]+)\s*\[.*?\]mg\/dLTRIGLICÉRIDOS/i)?.[1] || "";
      const ldl = coltotal && hdl && tgl && parseFloat(tgl) < 400 ? Math.round(parseFloat(coltotal) - parseFloat(hdl) - parseFloat(tgl)/5).toString() : "";
      const crea = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*mg\/dL\s*CREATININA/i)?.[1] || "";
      const bun = exam.content.match(/([\d.,]+)\[[^\]]+\]mg\/dL\s*BUN/i)?.[1] || "";
      const fosforo = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*FÓSFORO/i)?.[1] || "";
      const magnesio = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*MAGNESIO/i)?.[1] || "";
      const calcio = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*CALCIO/i)?.[1] || "";
      const calcioion = text.match(/([\d.,]+)\s*\[[\s\S]*?\]\s*mmol\/L\s*CALCIO IONICO/i)?.[1] || "";
      const gpt = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*GPT/i)?.[1] || "";
      const got = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*GOT/i)?.[1] || "";
      const ggt = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U[I]?\/L\s*GGT/i)?.[1] || "";
      const fa = text.match(/(\d+(?:[.,]\d+)?)\s*\[[^\]]+\]\s*U\/L\s*FOSFATASA ALCALINA/i)?.[1] || "";
      const bd = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*BILIRRUBINA DIRECTA/i)?.[1] || "";
      const bt = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*BILIRRUBINA TOTAL/i)?.[1] || "";
      const pcr = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*mg\/L\s*PROTEÍNA C REACTIVA/i)?.[1] || "";
      const lactico = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*mmol\/L\s*ÁCIDO LÁCTICO/i)?.[1] || "";
      const ldh = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*LDH/i)?.[1] || "";
      const ck = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*CREATINKINASA TOTAL/i)?.[1] || "";
      const ckmb = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*CREATINKINASA MB/i)?.[1] || "";
      const glicada = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*%?\s*HEMOGLOBINA GLICOSILADA/i)?.[1] || "";
      const buncrea = bun && crea ? Math.round(parseFloat(bun) / parseFloat(crea)) : "";
      const albumina = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*g\/dL\s*ALBÚMINA/i)?.[1] || "";
      const plaqMatch = exam.content.match(/([\d.]+)\s*miles\/uL\s*RCTO DE PLAQUETAS/i)?.[1] || "";
      const plaq = plaqMatch ? (parseFloat(plaqMatch) * 1000).toString() : "";
      const tropo = text.match(/([\d.,]+)\s*\[.*?\]\s*ng\/L\s*TROPONINA T ULTRASENSIBLE/i)?.[1] || "";

      // VFGE
      const creaNum = parseFloat(crea);
      const edadNum = parseFloat(edad);
      let vfg = "";
      if (creaNum && edadNum && sexo) {
        if (sexo == "FEMENINO" ) {
          if (creaNum <= 0.7) {
            vfg = Math.round(143.704 * Math.pow(creaNum/0.7, -0.241) * Math.pow(0.9938, edadNum)).toString();
          } else {
            vfg = Math.round(143.704 * Math.pow(creaNum/0.7, -1.2) * Math.pow(0.9938, edadNum)).toString();
          }
        } else if (sexo == "MASCULINO") {
          if (creaNum <= 0.9) {
            vfg = Math.round(142 * Math.pow(creaNum/0.9, -0.302) * Math.pow(0.9938, edadNum)).toString();
          } else {
            vfg = Math.round(142 * Math.pow(creaNum/0.9, -1.2) * Math.pow(0.9938, edadNum)).toString();
          }
        }
      }

      // GASES ARTERIALES
      const ph = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*PH/i)?.[1] || "";
      const pcodos = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*P\s*CO2/i)?.[1] || "";
      const podos = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*P\s*O2/i)?.[1] || "";
      const bicarb = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mmol\/L\s*HCO3/i)?.[1] || "";
      const tco2 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*T\s*CO2/i)?.[1] || "";
      const base = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mmol\/L\s*EBVT/i)?.[1] || ""; //esta como BE en el flujograma
      const satO2 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]%?\s*SATURACION\s*DE\s*O2/i)?.[1] || "";

      return {
        type: exam.type,
        nombre, rut, edad, sexo, fecha, hora,
        hto, hb, vcm, leuco, eritro, hcm, chcm, neu, linfocitos, mono, eosin, basofilos,
        sodio, potasio, cloro, 
        glucosa, coltotal, hdl, tgl, ldl, crea, bun, fosforo, magnesio, pcr, glicada, buncrea, albumina, plaq, tropo, vfg,
        calcio, calcioion, gpt, got, ggt, fa, bd, bt, lactico, ck, ckmb, ldh,
        ph, pcodos, podos, bicarb, base, satO2
      };
    }
  });

  return parsedExams

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

    // Flatten all parsed exams from all files
    const parsedExams = (await Promise.all(
      files.map(async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return parseLabPdf(buffer, index+1);
      })
    )).flat();

    if (process.env.NODE_ENV === "development") {
      exportData(JSON.stringify(parsedExams, null, 2), "parsed_exams");
    }

    // Separate ORINA vs CULTIVOS vs general exams
    const orinaExams = parsedExams
      .filter((exam) => exam.type.includes("ORINA COMPLETA"))
      .sort((a, b) => {
        const dateA = parseFechaHora(String(a.fecha ?? ""), String(a.hora ?? ""));
        const dateB = parseFechaHora(String(b.fecha ?? ""), String(b.hora ?? ""));
        return dateA.getTime() - dateB.getTime();
    });

    const cultivosExams = parsedExams
      .filter((exam) => exam.type.includes("CULTIVO"))
      .sort((a, b) => {
        const dateA = parseFechaHora(String(a.fecha ?? ""), String(a.hora ?? ""));
        const dateB = parseFechaHora(String(b.fecha ?? ""), String(b.hora ?? ""));
        return dateA.getTime() - dateB.getTime();
    });

    const normalExams = parsedExams
      .filter((exam) => !exam.type.includes("ORINA COMPLETA") && !exam.type.includes("CULTIVO"))
      .sort((a, b) => {
        const dateA = parseFechaHora(String(a.fecha ?? ""), String(a.hora ?? ""));
        const dateB = parseFechaHora(String(b.fecha ?? ""), String(b.hora ?? ""));
        return dateA.getTime() - dateB.getTime();
    });

    // Assign independent counters
    let orinaCounter = 0;
    let normalCounter = 0;
    let cultivosCounter = 0;

    const placeholdersArray = [
      ...orinaExams.map((exam) => {
        const index = ++orinaCounter;
        return Object.fromEntries(
          Object.entries(exam).map(([k, v]) => [`${k}_${index}`, v])
        );
      }),
      ...cultivosExams.map((exam) => {
        const index = ++cultivosCounter;
        return Object.fromEntries(
          Object.entries(exam).map(([k, v]) => [`${k}_${index}`, v])
        );
      }),
      ...normalExams.map((exam) => {
        const index = ++normalCounter;
        return Object.fromEntries(
          Object.entries(exam).map(([k, v]) => [`${k}_${index}`, v])
        );
      }),
    ];

    // Merge placeholders into one object for docxtemplater
    const mergedPlaceholders = Object.assign({}, ...placeholdersArray);
    
    if (process.env.NODE_ENV === "development") {
      exportData(JSON.stringify(placeholdersArray, null, 2), "exported_data");
    }

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