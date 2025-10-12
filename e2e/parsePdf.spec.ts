import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { Exam } from "@/app/types/exam";

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");
const BACKEND_URL = "http://localhost:3000/api/generate?json=true";

function safeExpectMatch(actual: Exam, expected: Exam) {
  try {
    expect(actual).toMatchObject(expected);
  } catch {
    throw new Error("JSON did not match");
  }
}

test.describe("PDF Parsing", () => {
  const items = fs.readdirSync(FIXTURES_DIR);

  for (const item of items) {
    const itemPath = path.join(FIXTURES_DIR, item);
    const stat = fs.statSync(itemPath);

    if (stat.isFile() && item.endsWith(".pdf")) {
      // --- Single PDF test ---
      const baseName = path.basename(item, ".pdf");
      const expectedPath = path.join(FIXTURES_DIR, `${baseName}.expected.json`);

      test(`should parse single ${item}`, async ({ request }) => {
        const pdfBuffer = fs.readFileSync(itemPath);

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
          throw new Error(`Missing expected JSON for ${item}`);
        }

        const expected: Exam = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

        if (process.env.CI === "true") {
          safeExpectMatch(json, expected);
        } else {
          expect(json).toMatchObject(expected);
        }
      });

    } else if (stat.isDirectory()) {
      // --- Folder test: multiple PDFs ---
      const folder = item;
      const folderPath = path.join(FIXTURES_DIR, folder);
      const pdfFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".pdf"));
      const expectedPath = path.join(folderPath, `${folder}.expected.json`);

      test(`should parse exams in ${folder}`, async ({ request }) => {
        if (!fs.existsSync(expectedPath)) {
          throw new Error(`Missing expected JSON for folder ${folder}`);
        }

        const multipart: Record<string, { name: string; mimeType: string; buffer: Buffer }> = {};

        pdfFiles.forEach((pdfFile, index) => {
          const pdfBuffer = fs.readFileSync(path.join(folderPath, pdfFile));
          multipart[`files_${index}`] = {
            name: "files", // the field name expected by your backend
            mimeType: "application/pdf",
            buffer: pdfBuffer,
          };
        });

        const response = await request.post(BACKEND_URL, { multipart });

        expect(response.ok()).toBeTruthy();

        const json = await response.json();
        const expected: Exam = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

        if (process.env.CI === "true") {
          safeExpectMatch(json, expected);
        } else {
          expect(json).toMatchObject(expected);
        }
      });
    }
  }
});