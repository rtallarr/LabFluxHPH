import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.resolve("e2e/fixtures");
const BACKEND_URL = "http://localhost:3000/api/generate?json=true";

async function bootstrap() {
  const files = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".pdf"));

  for (const file of files) {
    const jsonFile = path.join(FIXTURES_DIR, file.replace(".pdf", ".expected.json"));

    // Skip if JSON already exists
    if (fs.existsSync(jsonFile)) {
      console.log(`Skipping ${file}, JSON already exists.`);
      continue;
    }

    const filePath = path.join(FIXTURES_DIR, file);
    const pdfBuffer = fs.readFileSync(filePath);

    // FormData in Node 22+
    const formData = new FormData();
    formData.append("files", new Blob([pdfBuffer], { type: "application/pdf" }), file);

    console.log(`Uploading ${file}...`);

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error(`Failed for ${file}: ${res.statusText}`);
      continue;
    }

    const json = await res.json();
    fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2));

    console.log(`Saved expected JSON: ${jsonFile}`);
  }

  console.log("All fixtures bootstrapped!");
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});