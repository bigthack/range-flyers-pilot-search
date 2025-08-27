import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { PrismaClient } from "@prisma/client";
import { parseChunkedField } from "./parse_utils";

const prisma = new PrismaClient();
const dataDir = path.resolve(".data", "faacsv");

type BasicRow = {
  "UNIQUE ID": string; "FIRST & MIDDLE NAME": string; "LAST NAME & SUFFIX": string;
  "STREET 1": string; "STREET 2": string; "CITY": string; "STATE": string; "ZIP CODE": string;
  "COUNTRY-NAME": string; "REGION": string; "MEDICAL CLASS": string; "MEDICAL DATE": string;
  "MEDICAL EXPIRE DATE": string; "BASIC MED COURSE DATE": string; "BASIC MED CMEC DATE": string;
};
type CertRow = {
  "UNIQUE ID": string; "RECORD TYPE": string; "CERTIFICATE TYPE": string; "CERTIFICATE LEVEL": string;
  "CERTIFICATE EXPIRE DATE": string; "RATINGS": string; "TYPE RATINGS": string;
};

function parseMMYYYY(s?: string) { if (!s?.trim()) return null; const mm=s.slice(0,2), yyyy=s.slice(2,6); return new Date(Date.UTC(+yyyy||1970,(+mm||1)-1,1)); }
function parseMMDDYYYY(s?: string) { if (!s?.trim()) return null; const mm=+s.slice(0,2), dd=+s.slice(2,4), yyyy=+s.slice(4,8); if(!mm||!dd||!yyyy) return null; return new Date(Date.UTC(yyyy,mm-1,dd)); }

async function readCSV<T=any>(file: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    fs.createReadStream(file)
      .pipe(parse({ columns: true, relaxColumnCount: true, skip_empty_lines: true }))
      .on("data", (rec) => rows.push(rec))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function main() {
  const basicPath = path.join(dataDir, "PILOT_BASIC.csv");
  const certPath  = path.join(dataDir, "PILOT_CERT.csv");
  if (!fs.existsSync(basicPath) || !fs.existsSync(certPath)) throw new Error("Missing CSVs");

  const basics = await readCSV<BasicRow>(basicPath);
  const certs  = await readCSV<CertRow>(certPath);

  const byId = new Map<string, CertRow[]>();
  for (const c of certs) { const id = c["UNIQUE ID"]; if (!byId.has(id)) byId.set(id, []); byId.get(id)!.push(c); }

  const batchSize = 1000;
  for (let i = 0; i < basics.length; i += batchSize) {
    const batch = basics.slice(i, i + batchSize);
    console.log(`Importing ${i}–${i + batch.length} / ${basics.length}`);
    await prisma.$transaction(async (tx) => {
      for (const b of batch) {
        const uniqueId = b["UNIQUE ID"];
        const first = (b["FIRST & MIDDLE NAME"] || "").split(" ")[0].trim();
        const last  = (b["LAST NAME & SUFFIX"] || "").split(" ")[0].trim();
        const medicalClass = b["MEDICAL CLASS"]?.trim() ? Number(b["MEDICAL CLASS"]) : null;

        const airman = await tx.airman.upsert({
          where: { uniqueId },
          create: {
            uniqueId, firstName: first || "", lastName: last || "",
            street1: b["STREET 1"] || null, street2: b["STREET 2"] || null,
            city: b["CITY"] || null, state: b["STATE"] || null, zip: b["ZIP CODE"] || null,
            country: b["COUNTRY-NAME"] || null, region: b["REGION"] || null,
            medicalClass: medicalClass,
            medicalDate: parseMMYYYY(b["MEDICAL DATE"]) || undefined,
            medicalExpireDate: parseMMYYYY(b["MEDICAL EXPIRE DATE"]) || undefined,
            basicMedCourseDate: b["BASIC MED COURSE DATE"] ? new Date(b["BASIC MED COURSE DATE"]) : undefined,
            basicMedCmecDate: b["BASIC MED CMEC DATE"] ? new Date(b["BASIC MED CMEC DATE"]) : undefined
          },
          update: {
            firstName: first || "", lastName: last || "",
            street1: b["STREET 1"] || null, street2: b["STREET 2"] || null,
            city: b["CITY"] || null, state: b["STATE"] || null, zip: b["ZIP CODE"] || null,
            country: b["COUNTRY-NAME"] || null, region: b["REGION"] || null,
            medicalClass: medicalClass,
            medicalDate: parseMMYYYY(b["MEDICAL DATE"]) || undefined,
            medicalExpireDate: parseMMYYYY(b["MEDICAL EXPIRE DATE"]) || undefined,
            basicMedCourseDate: b["BASIC MED COURSE DATE"] ? new Date(b["BASIC MED COURSE DATE"]) : undefined,
            basicMedCmecDate: b["BASIC MED CMEC DATE"] ? new Date(b["BASIC MED CMEC DATE"]) : undefined
          }
        });

        await tx.pilotCertificate.deleteMany({ where: { airmanId: airman.id } });
        await tx.pilotRating.deleteMany({ where: { airmanId: airman.id } });
        await tx.pilotTypeRating.deleteMany({ where: { airmanId: airman.id } });

        const certRows = byId.get(uniqueId) || [];
        const levels = new Set<string>();
        let hasInstrument = false, hasMulti = false, hasJet = false;

        for (const c of certRows) {
          const certType  = c["CERTIFICATE TYPE"]?.trim() || "";
          const certLevel = c["CERTIFICATE LEVEL"]?.trim() || "";
          if (certLevel) levels.add(certLevel);

          await tx.pilotCertificate.create({
            data: {
              airmanId: airman.id, certType, certLevel,
              certExpire: c["CERTIFICATE EXPIRE DATE"] ? ( (() => { const d=c["CERTIFICATE EXPIRE DATE"]; const mm=+d.slice(0,2), dd=+d.slice(2,4), yyyy=+d.slice(4,8); return new Date(Date.UTC(yyyy,mm-1,dd)); })() ) : undefined
            }
          });

          for (const r of parseChunkedField(c["RATINGS"])) {
            await tx.pilotRating.create({ data: { airmanId: airman.id, levelChar: r.levelChar, code: r.code } });
            if (r.code.startsWith("INST")) hasInstrument = true;
            if (r.code in { AMEL:1, AMES:1, ASME:1 }) hasMulti = true;
            if (r.code === "JET") hasJet = true;
          }

          for (const t of parseChunkedField(c["TYPE RATINGS"])) {
            await tx.pilotTypeRating.create({ data: { airmanId: airman.id, levelChar: t.levelChar, typeCode: t.code } });
            hasJet = true;
          }
        }

        await tx.airman.update({
          where: { id: airman.id },
          data: { certificateLevels: Array.from(levels), hasInstrument, hasMultiEngine: hasMulti, hasJet }
        });
      }
    });
  }
  console.log("Import complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
