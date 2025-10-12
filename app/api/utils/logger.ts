import fs from "fs";
import path from "path";

export function exportData(data: string, filename: string) {
  const exportDir = path.join(process.cwd(), "assets", "parsed_data");

  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const exportPath = path.join(process.cwd(), "assets", "parsed_data", filename+".json");
  fs.writeFileSync(exportPath, data);
  //console.log(`Data exported to ${exportPath}`);
}

export function pdfExportData(data: string, nombre: string, fecha: string, hora: string) {
  const filename = nombre.split(" ")[0] + fecha.replace(/\//g, "-") + "_" + hora.replace(/:/g, "_");
  const exportDir = path.join(process.cwd(), "assets", "pdf_data");

  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const exportPath = path.join(process.cwd(), "assets", "pdf_data", filename+".txt");
  fs.writeFileSync(exportPath, data);
  //console.log(`Data exported to ${exportPath}`);
}