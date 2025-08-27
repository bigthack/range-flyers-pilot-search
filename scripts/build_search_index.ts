import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

const prisma = new PrismaClient();
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
  await client.query('CREATE INDEX IF NOT EXISTS airman_name_trgm ON "Airman" USING gin ((firstName || \' \' || lastName) gin_trgm_ops);');
  await client.query('CREATE INDEX IF NOT EXISTS pilot_type_trgm  ON "PilotTypeRating" USING gin (typeCode gin_trgm_ops);');
  await client.query('CREATE INDEX IF NOT EXISTS pilot_rating_trgm ON "PilotRating" USING gin (code gin_trgm_ops);');
  await client.end();
  await prisma.$disconnect();
  console.log("Indexes built.");
}
main().catch((e) => { console.error(e); process.exit(1); });
