type NormalRange = {
  unit: string;
  low?: number;
  high?: number;
  note?: string;
};

const normalRanges: Record<string, NormalRange> = {
    "HEMATOCRITO": { unit: "%", low: 35, high: 47 },
    "HEMOGLOBINA": { unit: "g/dL", low: 12.3, high: 15.3 },
    "RCTO DE RITROCITOS": { unit: "millón/uL", low: 4.1, high: 5.1 },
    "VCM": { unit: "fL", low: 80, high: 98 },
    "HCM": { unit: "pg", low: 28, high: 33 },
    "CHCM": { unit: "g/dL", low: 33, high: 36 },
    "RCTO DE LEUCOCITOS": { unit: "miles/μL", low: 4.4, high: 11.3 },
    "FACTOR REUMATOIDEO": { unit: "UI/mL", high: 14 },
    "C4": { unit: "mg/dL", low: 10, high: 40 },
  "BILIRRUBINA DIRECTA": { unit: "mg/dL", low: 0.0, high: 0.6 },
  "BILIRRUBINA TOTAL": { unit: "mg/dL", high: 1.2, note: "Hasta 1.2" },
  "ÁCIDO LÁCTICO": { unit: "mmol/L", low: 0.5, high: 2.2 },
  "CREATINKINASA TOTAL": { unit: "U/L", high: 190, note: "<190" },
  "CREATINKINASA MB": { unit: "U/L", low: 7, high: 25 },
  "CALCIO IONICO": { unit: "mmol/L", low: 1.20, high: 1.40 },
  "LDH": { unit: "U/L", low: 135, high: 214 },
  "GLUCOSA": { unit: "mg/dL", low: 82, high: 115 },
  "PORCENTAJE": { unit: "%", low: 74.5, high: 120 },
  "INR": { unit: "", low: 0.97, high: 1.27 },
  "TTPA": { unit: "seg", low: 25.1, high: 38.9 },
  "HORMONA TIROESTIMULANTE (TSH)": { unit: "μUI/mL", low: 0.27, high: 4.20 },
  "AMILASA": { unit: "U/L", low: 28, high: 100 },
  "PROTEÍNAS TOTALES": { unit: "g/dL", low: 6.4, high: 8.3 },
  "ÁCIDO ÚRICO": { unit: "mg/dL", low: 3.4, high: 7.0 },
  "NIVELES VITAMINA B12": { unit: "pg/mL", low: 197, high: 771 },
  "INMUNOGLOBULINA A (IGA)": { unit: "mg/dL", low: 70, high: 400 },
  "IGE TOTAL": { unit: "UI/mL", high: 100, note: "< 100" },
  "COMPLEMENTO C3": { unit: "mg/dL", low: 90, high: 180 },
  "FIERRO": { unit: "μg/dL", low: 33, high: 193 },
  "TIBC": { unit: "μg/dL", low: 250, high: 400 },
  "% SATURACIÓN DE TRANSFERRINA": { unit: "%", low: 15, high: 50 },
  "TETRAIDOTIRONINA LIBRE (T4L)": { unit: "ng/dL", low: 0.93, high: 1.7 },
  "ANTICUERPO ANTI PÉPTIDO CITRULINADO (CCP)": { unit: "U/mL", low: 0, high: 17 },
  "PROTEÍNA C REACTIVA": { unit: "mg/L", note: "< 5" },
  "BILIRRUBINA INDIRECTA": { unit: "mg/dL", low: 0.1, high: 0.9 },
  "TGO (AST)": { unit: "U/L", low: 10, high: 40 },
  "TGP (ALT)": { unit: "U/L", low: 10, high: 45 },
  "FOSFATASA ALCALINA": { unit: "U/L", low: 38, high: 126 },
  "GAMMA GLUTAMIL TRANSFERASA (GGT)": { unit: "U/L", low: 8, high: 61 },
  "UREA": { unit: "mg/dL", low: 15, high: 40 },
  "CREATININA": { unit: "mg/dL", low: 0.6, high: 1.3 },
  "COLESTEROL TOTAL": { unit: "mg/dL", low: 0, high: 200 },
  "COLESTEROL HDL": { unit: "mg/dL", low: 35, high: 65 },
  "COLESTEROL LDL": { unit: "mg/dL", low: 0, high: 130 },
  "TRIGLICÉRIDOS": { unit: "mg/dL", low: 0, high: 150 },
  "ALBÚMINA": { unit: "g/dL", low: 3.5, high: 5.0 },
  "GLÓBULOS BLANCOS": { unit: "x10³/μL", low: 4.0, high: 10.0 },
  "GLÓBULOS ROJOS": { unit: "x10⁶/μL", low: 4.5, high: 5.9 },
  "PLAQUETAS": { unit: "x10³/μL", low: 150, high: 400 },
  "VELOCIDAD DE ERITROSEDIMENTACIÓN (VHS)": { unit: "mm/h", low: 0, high: 20 },
  "PROTEÍNA TOTAL EN ORINA": { unit: "mg/dL", low: 0, high: 15 },
  "GLUCOSA EN ORINA": { unit: "mg/dL", low: 0, high: 15 },
  "CETONAS EN ORINA": { unit: "mg/dL", low: 0, high: 5 },
  "HEMOGLOBINA EN ORINA": { unit: "mg/dL", low: 0, high: 0.03 },
  "BILIRRUBINA EN ORINA": { unit: "mg/dL", low: 0, high: 0.02 },
  "UROBILINÓGENO EN ORINA": { unit: "mg/dL", low: 0.1, high: 1.0 },
  "DENSIDAD ORINA": { unit: "", low: 1.005, high: 1.030 },
  "PH ORINA": { unit: "", low: 5.0, high: 8.0 },
  "NITRITOS": { unit: "", note: "Negativo" },
  "LEUCOCITOS EN ORINA": { unit: "", note: "Negativo" },
  "ASPECTO ORINA": { unit: "", note: "Claro" },
  "COLOR ORINA": { unit: "", note: "Amarillo claro" }
};

export function isNormal(testName: string, value: number): boolean | null {
  const range = normalRanges[testName];
  if (!range) return null; // Unknown test
  if (typeof range.low === "number" && value < range.low) return false;
  if (typeof range.high === "number" && value > range.high) return false;
  return true;
}