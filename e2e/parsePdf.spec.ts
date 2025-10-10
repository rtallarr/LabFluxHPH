import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");
const BACKEND_URL = "http://localhost:3000/api/generate?debug=json";

test.describe("PDF Parsing", () => {
  const pdfFiles = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".pdf"));

  for (const pdfFile of pdfFiles) {
    const baseName = path.basename(pdfFile, ".pdf");
    const expectedPath = path.join(FIXTURES_DIR, `${baseName}.expected.json`);

    test(`should parse ${pdfFile}`, async ({ request }) => {
      const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, pdfFile));

      const response = await request.post(BACKEND_URL, {
        multipart: {
          files: {
            name: "files",
            mimeType: "application/pdf",
            buffer: pdfBuffer,
          },
        },
      });

      expect(response.ok()).toBeTruthy();

      const json = await response.json();

      if (!fs.existsSync(expectedPath)) {
        throw new Error(`Missing expected JSON for ${pdfFile} → ${expectedPath}`);
      }

      const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

      expect(json).toMatchObject(expected);
    });
  }
});