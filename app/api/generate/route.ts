import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import pdf from "pdf-parse";

import { Exam } from "@/app/types/exam";

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
  const sections = text.split(/(?=RECEPCI[OÓ]N\s*:)/g);

  const exams: { type: string; content: string }[] = [];
  const specialExamRegex = /(ORINA COMPLETA.*|.*CULTIVO.*)/gi;

  for (const section of sections) {
    const trimmedSection = section.trim();

    if (trimmedSection.startsWith("PACIENTE") || trimmedSection.startsWith("Unidad")) {
      continue; // skip irrelevant sections
    }

    const matches = [...trimmedSection.matchAll(specialExamRegex)];

    let type: string;
    if (matches.length === 0) {
      type = "EXÁMENES GENERALES";
    } else {
      type = matches[0][0].trim();
    }

    // Check if this type already exists
    const existing = exams.find(e => e.type === type);
    if (existing) {
      existing.content += "\n\n" + trimmedSection; // merge content
    } else {
      exams.push({ type, content: trimmedSection });
    }

  }
  return exams;
}

function cleanExam<T extends { type: string; rut: string; nombre: string; edad: string; sexo: string }>(exam: T): T {
  const requiredKeys = ["type", "rut", "nombre", "edad", "sexo"];
  return Object.fromEntries(
    Object.entries(exam)
      .filter(([key, value]) => {
        // always keep required keys
        if (requiredKeys.includes(key)) return true;
        // keep optional keys only if not empty
        return value !== "" && value !== null && value !== undefined;
      })
  ) as T;
}

async function parseLabPdf(buffer: Buffer, count: number): Promise<Exam[]> {
  const data = await pdf(buffer);
  const text = data.text;

  const exams = splitExams(text);
  
  if (process.env.NODE_ENV === "development") {
    exportData(JSON.stringify(exams, null, 2), "exam_split"+count);
  }

  const nombre = text.match(/PACIENTE\s*:\s*(.+)/i)?.[1]?.trim() || "";
  const rut = text.match(/\d{1,2}\.\d{3}\.\d{3}-[\dkK]/i)?.[0] || "";
  const sexo = text.match(/\b(FEMENINO|MASCULINO)\b/i)?.[1] || "";
  const edad = text.match(/(\d+)\s*años/i)?.[1] || "";

  const parsedExams = exams.map((exam) => {
    const recepcionMatch = exam.content.match(/RECEPCI[OÓ]N:[\s\S]*?\d{2}[\/-]\d{2}[\/-]\d{4}\s\d{2}:\d{2}[\s\S]*?(\d{2}[\/-]\d{2}[\/-]\d{4})\s(\d{2}:\d{2})/);

    if (exam.type.includes("ORINA COMPLETA")) {
      const fechaoc = recepcionMatch?.[1].replace(/-/g, "/") || "";
      const horaoc = recepcionMatch?.[2] || "";

      if (process.env.NODE_ENV === "development") {
        if (text && nombre && fechaoc && horaoc) {
          pdfExportData(text, nombre, fechaoc, horaoc);
        } else {
          pdfExportData(text, "missing", "_data", count.toString());
        }
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
        densoc, phoc, leucosoc, groc, nitritosoc, protoc, cetonasoc, glucosaoc, urobiloc, bilioc,
        globRojos, mucusoc, bactoc, hialoc, granuloc, epiteloc, cristaloc, levadoc,
      };

    } else if (exam.type.includes("CULTIVOS")) {
      const fechacul = recepcionMatch?.[1].replace(/-/g, "/") || "";
      const horacul = recepcionMatch?.[2] || "";

      if (process.env.NODE_ENV === "development") {
        if (text && nombre && fechacul && horacul) {
          pdfExportData(text, nombre, fechacul, horacul);
        } else {
          pdfExportData(text, "missing", "_data", count.toString());
        }
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
        if (text && nombre && fecha && hora) {
          pdfExportData(text, nombre, fecha, hora);
        } else {
          pdfExportData(text, "missing", "_data", count.toString());
        }
      }

      // PERFIL HEMATOLÓGICO
      const hto = exam.content.match(/([\d.,]+)\s*%?\s*HEMATOCRITO/i)?.[1] || "";
      const hb = exam.content.match(/([\d.,]+)\s*g\/dL\s*HEMOGLOBINA/i)?.[1] || "";
      const eritro = exam.content.match(/([\d.,]+)\s*mill[oó]n\/uL\s*RCTO DE ERITROCITOS/i)?.[1] || ""; //agregar al flujo
      const vcm = exam.content.match(/([\d.,]+)\s*fL\s*VCM/i)?.[1] || "";
      const hcm = exam.content.match(/([\d.,]+)\s*pg\s*HCM/i)?.[1] || "";
      const chcm = exam.content.match(/CHCM\s*[*]?\s*([\d.,]+)/i)?.[1] || "";
      const plaqMatch = exam.content.match(/([\d.]+)\s*miles\/uL\s*RCTO DE PLAQUETAS/i)?.[1] || "";
      const plaq = plaqMatch ? (parseFloat(plaqMatch) * 1000).toString() : "";
      const vhs = exam.content.match(/([\d.,]+)\s*\[.*\]\s*mm\/hrs\s*VHS/i)?.[1] || "";

      // HEMATOLÓGICO - CELULAS
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

      //FIERRO
      const fierro = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]μg\/dLFIERRO/i)?.[1] || "";
      const tibc = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]μg\/dLTIBC/i)?.[1] || "";
      const uibc = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]μg\/dLUIBC/i)?.[1] || "";
      const satFe = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]%%?\s*SATURACIÓN DE TRANSFERRINA/i)?.[1] || "";

      //MARCADORES
      const pcr = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*mg\/L\s*PROTEÍNA C REACTIVA/i)?.[1] || "";
      const lactico = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*mmol\/L\s*ÁCIDO LÁCTICO/i)?.[1] || "";
      const ldh = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*LDH/i)?.[1] || "";
      const tropo = text.match(/([\d.,]+)\s*\[.*?\]\s*ng\/L\s*TROPONINA T ULTRASENSIBLE/i)?.[1] || "";
      const ck = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]U\/LCREATINKINASA TOTAL/i)?.[1] || "";
      const ckmb = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*CREATINKINASA MB/i)?.[1] || "";
      const dimd = exam.content.match(/([\d.,]+)\s*(?=\[)\s*ng\/mL\s*DIMERO D/i)?.[1] || "";
      const procal = exam.content.match(/([\d.,]+)\s*ng\/mL\s*PROCALCITONINA/i)?.[1] || "";

      //RENAL
      const bun = exam.content.match(/([\d.,]+)\[[^\]]+\]mg\/dL\s*BUN/i)?.[1] || "";
      const crea = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*mg\/dL\s*CREATININA/i)?.[1] || "";
      const buncrea = bun && crea ? Math.round(parseFloat(bun) / parseFloat(crea)) : "";
      const acurico = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]mg\/dLÁCIDO ÚRICO/i)?.[1] || "";

      // ELECTROLITOS
      const sodio = exam.content.match(/([\d.,]+)\[[^\]]+\]mEq\/L\s*SODIO/i)?.[1] || "";
      const potasio = exam.content.match(/([\d.,]+)\[[^\]]+\]mEq\/L\s*POTASIO/i)?.[1] || "";
      const cloro = exam.content.match(/([\d.,]+)\[[^\]]+\]mEq\/L\s*CLORO/i)?.[1] || "";
      const calcio = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*CALCIO/i)?.[1] || "";
      const calcioion = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]mmol\/LCALCIO IONICO/i)?.[1] || "";
      const fosforo = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*FÓSFORO/i)?.[1] || "";
      const magnesio = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*MAGNESIO/i)?.[1] || "";

      // GASES ARTERIALES
      const ph = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*PH/i)?.[1] || "";
      const pcodos = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*P\s*CO2/i)?.[1] || "";
      const podos = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*P\s*O2/i)?.[1] || "";
      const bicarb = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mmol\/L\s*HCO3/i)?.[1] || "";
      const tco2 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mm\/Hg\s*T\s*CO2/i)?.[1] || "";
      const base = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*mmol\/L\s*EBVT/i)?.[1] || ""; //esta como BE en el flujograma
      const satO2 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]%?\s*SATURACION\s*DE\s*O2/i)?.[1] || "";

      //HEPÁTICO
      const proteinas = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]g\/dLPROTEÍNAS TOTALES/i)?.[1] || "";
      const albumina = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*g\/dL\s*ALBÚMINA/i)?.[1] || "";
      const bd = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*BILIRRUBINA DIRECTA/i)?.[1] || "";
      const bt = text.match(/([\d.,]+)\s*\[[^\]]+\]\s*mg\/dL\s*BILIRRUBINA TOTAL/i)?.[1] || "";
      const got = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*GOT/i)?.[1] || "";
      const gpt = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U\/L\s*GPT/i)?.[1] || "";
      const ggt = text.match(/(\d+(?:[.,]\d+)?)\s*\[.*?\]\s*U[I]?\/L\s*GGT/i)?.[1] || "";
      const fa = text.match(/(\d+(?:[.,]\d+)?)\s*\[[^\]]+\]\s*U\/L\s*FOSFATASA ALCALINA/i)?.[1] || "";
      const amilasa = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]U\/LAMILASA/i)?.[1] || "";
      const amonio = exam.content.match(/([\d.,]+)\s*\[.*\]\s*.mol\/L\s*AMONIO/i)?.[1] || "";

      //METABOLICO / NUTRICIONAL
      const glucosa = text.match(/([\d.,]+)\s*\[.*?\]\s*mg\/dL\s*GLUCOSA/i)?.[1] || "";
      const glicada = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]\s*%?\s*HEMOGLOBINA GLICOSILADA/i)?.[1] || "";
      const coltotal = exam.content.match(/([\d.,]+)\s*\[Ideal/i)?.[1] || "";
      const hdl = exam.content.match(/([\d.,]+)\s*\[.*?\]\s*mg\/dL\s*COLESTEROL HDL/i)?.[1] || "";
      const tgl = exam.content.match(/([\d.,]+)\s*\[.*?\]mg\/dLTRIGLICÉRIDOS/i)?.[1] || "";
      const ldl = coltotal && hdl && tgl && parseFloat(tgl) < 400 ? Math.round(parseFloat(coltotal) - parseFloat(hdl) - parseFloat(tgl)/5).toString() : "";
      const vitb = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]pg\/mLNIVELES VITAMINA B12/i)?.[1] || "";
      const vitD = exam.content.match(/([\d.,]+)\s*(?=\[)\s*ng\/mL\s*NIVELES VITAMINA D/i)?.[1] || "";

      // COAGULACION
      const tp = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]%PORCENTAJE/i)?.[1] || "";
      const inr = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]INR/i)?.[1] || "";
      const ttpk = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]segTTPA/i)?.[1] || "";

      //INMUNOLOGICO
      const fetoprot = exam.content.match(/([\d.,]+)\s*\[\s*[\d.,]+\s*-\s*[\d.,]+\s*\]\s*UI\/mL\s*ALFAFETOPROTEÍNA/i)?.[1] || "";
      const acCCP = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*U\/mL\s*ANTICUERPO ANTI P[ÉE]PTIDO\s*CITRULINADO \(CCP\)/i)?.[1] || "";
      const acTPO = exam.content.match(/([\d.,]+)\s*\[\s*<?[\d.,]+\s*\]\s*UI\/mL\s*ANTICUERPOS ANTI-PEROXIDASA/i)?.[1] || "";
      const aso = exam.content.match(/([\d.,]+)\s*UI\/mL\s*ANTICUERPOS ANTI ESTREPTOLISINA O\s*\(ASO\)/i)?.[1] || "";
      const ca125 = exam.content.match(/([\d.,]+)\s*\[\s*[\d.,\s–-]+\s*\]\s*U\/mL\s*ANTÍGENO CA-125/i)?.[1] || "";
      const C3 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]mg\/dLCOMPLEMENTO C3/i)?.[1] || "";
      const C4 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]mg\/dLCOMPLEMENTO C4/i)?.[1] || "";
      const fReum = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]UI\/mLFACTOR REUMATOIDEO/i)?.[1] || "";
      const IGA = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]mg\/dLINMUNOGLOBULINA A/i)?.[1] || "";
      const IGG = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]mg\/dLINMUNOGLOBULINA G/i)?.[1] || "";
      const IGM = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]mg\/dLINMUNOGLOBULINA M/i)?.[1] || "";
      const IGE = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]UI\/mLIGE TOTAL/i)?.[1] || "";

      // ENDOCRINOLOGICO
      const antiTG = exam.content.match(/([\d.,]+)\s*\[\s*[\d.,]+\s*-\s*[\d.,]+\s*\]\s*UI\/mL\s*ANTI-TIROGLOBULINA\s*\(ANTI-TG\)/i)?.[1] || "";
      const tiroglob = exam.content.match(/([\d.,]+)\s*\[.*\]\s*ng\/mL\s*TIROGLOBULINA/i)?.[1] || "";
      const hcg = exam.content.match(/(<?[\d.,]+)\s*(?=\[)\s*mUI\/mL\s*GONADOTROFINA CORIÓNICA/i)?.[1] || "";
      const cortisol = exam.content.match(/([\d.,]+)\s*\[\s*[\d.,]+-[\d.,]+\s*\]\s*μg\/dL\s*CORTISOL AM/i)?.[1] || "";
      const insulina = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*.UI\/mL\s*INSULINA BASAL/i)?.[1] || "";
      const estradiol = exam.content.match(/([\d.,]+)\s*pg\/mL\s*ESTRADIOL/i)?.[1] || "";
      const FSH = exam.content.match(/(<?[\d.,]+)\s*(?=\[)[\s\S]*?mIU\/mL\s*FSH/i)?.[1] || "";
      const LH = exam.content.match(/(<?[\d.,]+)\s*(?=\[)[\s\S]*?mUI\/mL\s*HORMONA LUTEINIZANTE\s*\(LH\)/i)?.[1] || "";
      const PTH = exam.content.match(/([\d.,]+)\s*\[\s*[\d.,]+\s*-\s*[\d.,]+\s*\]\s*pg\/mL\s*HORMONA PARATIROIDEA INTACTA/i)?.[1] || "";
      const testo = exam.content.match(/([\d.,]+)\s*(?=\[)\s*ng\/mL\s*TESTOSTERONA/i)?.[1] || "";
      const T3 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*.g\/mL\s*TRIIODOTIRONINA\s*\(T3\)/i)?.[1] || "";
      const T4 = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*.g\/dL\s*TETRAIODOTIRONINA\s*\(T4\)/i)?.[1] || "";
      const t4l = exam.content.match(/([\d.,]+)\s*\[[^\]]*\]\s*ng\/dL\s*TETRAIDOTIRONINA LIBRE\s*\(T4L\)/i)?.[1] || "";
      const tsh = exam.content.match(/([\d.,]+)\s*\[[^\]]+\]μUI\/mLHORMONA TIROESTIMULANTE \(TSH\)/i)?.[1] || "";

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

      const fields = {
        type: exam.type,
        nombre, rut, edad, sexo, fecha, hora,
        hto, hb, vcm, hcm, plaq, vhs, leuco, neu, linfocitos, mono, eosin, basofilos, eritro,
        fierro, tibc, uibc, satFe,
        pcr, lactico, ldh, tropo, ck, ckmb, procal,
        bun, crea, buncrea, vfg, acurico,
        sodio, potasio, cloro, calcio, calcioion, fosforo, magnesio,
        ph, pcodos, podos, bicarb, tco2, base,
        proteinas, albumina, bd, bt, got, gpt, ggt, fa, amilasa, amonio,
        glucosa, glicada, coltotal, hdl, tgl, ldl, vitb, vitD,
        tp, inr, ttpk,
        fetoprot, acCCP, acTPO, aso, ca125, C3, C4, fReum, IGG, IGA, IGM, IGE, 
        antiTG, tiroglob, hcg, cortisol, insulina, estradiol, FSH, LH, PTH, testo, T3, T4, t4l, tsh,
      };

      return cleanExam(fields);;
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

    const parsedExams = (await Promise.all(
      files.map(async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return parseLabPdf(buffer, index+1);
      })
    )).flat();

    if (process.env.NODE_ENV === "development") {
      exportData(JSON.stringify(parsedExams, null, 2), "parsed_exams");
    }

    const url = new URL(req.url);
    if (url.searchParams.get('json') === 'true') {
      return new NextResponse(JSON.stringify(parsedExams, null, 2), { status: 200 });
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

    const skipKeys = ["rut", "nombre", "edad", "sexo"];

    function mapExamWithIndex(exam: Exam, index: number, shouldSkipKeys: boolean = true) {
      return Object.fromEntries(
        Object.entries(exam)
          .filter(([k]) => !shouldSkipKeys || !skipKeys.includes(k.toLowerCase()))
          .map(([k, v]) => [`${k}_${index}`, v])
      );
    }

    const placeholdersArray = [
      ...orinaExams.map((exam) => mapExamWithIndex(exam, ++orinaCounter)),
      ...cultivosExams.map((exam) => mapExamWithIndex(exam, ++cultivosCounter)),
      ...normalExams.map((exam) => mapExamWithIndex(exam, ++normalCounter, normalCounter > 1)),
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