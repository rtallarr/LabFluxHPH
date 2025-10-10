import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test("should parse lab pdf and return JSON", async ({ request }) => {
  const filePath = path.resolve(__dirname, "fixtures/sample3.pdf");
  const pdfBuffer = fs.readFileSync(filePath);

  const response = await request.post(
    "http://localhost:3000/api/generate?debug=json",
    {
      multipart: {
        files: {
          name: "files",
          mimeType: "application/pdf",
          buffer: pdfBuffer,
        },
      },
    }
  );

  expect(response.ok()).toBeTruthy();

  const json = await response.json();

  const expected = [{
    type: "EXÁMENES GENERALES",
    nombre: "ROJAS TRONCOSO GILDA BERNARDITA",
    rut: "7.162.575-3",
    edad: "69",
    sexo: "FEMENINO",
    fecha: "07/10/2025",
    hora: "12:22",
    calcio: "9.8",
    PTH: "25.9"
  }];

  expect(json).toMatchObject(expected);
});