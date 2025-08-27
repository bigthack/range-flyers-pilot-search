import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import https from "node:https";

const CSV_ZIP_URL = process.env.FAA_CSV_ZIP_URL ?? "https://registry.faa.gov/download/airmen/CSV.zip";
const outDir = path.resolve(".data", "faacsv");
const zipPath = path.join(outDir, "airmen_csv.zip");

async function ensureDir(p: string) { await fs.promises.mkdir(p, { recursive: true }); }
async function download(url: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => res2.pipe(file));
      } else { res.pipe(file); }
      file.on("finish", () => file.close(() => resolve()));
    }).on("error", (err) => reject(err));
  });
}
async function unzip(zipFile: string, destDir: string) {
  await new Promise<void>((resolve, reject) => {
    const bin = process.platform === "win32" ? "tar.exe" : "unzip";
    const args = process.platform === "win32" ? ["-xf", zipFile, "-C", destDir] : ["-o", zipFile, "-d", destDir];
    const proc = spawn(bin, args, { stdio: "inherit" });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`unzip failed ${code}`))));
  });
}
(async () => {
  await ensureDir(outDir);
  console.log("Downloading FAA CSV ZIP…", CSV_ZIP_URL);
  await download(CSV_ZIP_URL, zipPath);
  console.log("Unzipping to", outDir);
  await unzip(zipPath, outDir);
  console.log("Done.");
})().catch((e) => { console.error(e); process.exit(1); });
